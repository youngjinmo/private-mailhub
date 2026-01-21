import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { CacheService } from '../cache/cache.service';
import { RelayEmail } from './entities/relay-email.entity';
import { S3Service } from 'src/aws/s3/s3.service';
import { S3EventRecord, SqsService } from 'src/aws/sqs/sqs.service';
import { SendMailService } from 'src/aws/ses/send-mail.service';
import { ParsedMail, simpleParser } from 'mailparser';
import { Message } from '@aws-sdk/client-sqs';

@Injectable()
export class RelayEmailsService {
  private readonly logger = new Logger(RelayEmailsService.name);
  constructor(
    @InjectRepository(RelayEmail)
    private readonly relayEmailRepository: Repository<RelayEmail>,
    private readonly s3Service: S3Service,
    private readonly sqsService: SqsService,
    private readonly sendMailService: SendMailService,
    private readonly cacheService: CacheService,
  ) {}

  async generateRelayEmailAddress(
    userId: bigint,
    primaryEmail: string,
  ): Promise<RelayEmail> {
    // Generate a unique relay address
    let relayAddress: string = '';
    let exists = true;

    while (exists) {
      const randomString = randomBytes(8).toString('hex');
      relayAddress = `${randomString}@private-mailhub.com`;

      // Check if this relay address already exists
      const existing = await this.relayEmailRepository.findOne({
        where: { relayAddress },
      });

      exists = !!existing;
    }

    // Create the relay email record
    const relayEmail = this.relayEmailRepository.create({
      userId,
      primaryEmail,
      relayAddress,
    });

    const savedRelayEmail = await this.relayEmailRepository.save(relayEmail);

    // Cache the mapping
    await this.cacheService.storeRelayEmailMapping(
      relayAddress,
      primaryEmail,
    );

    return savedRelayEmail;
  }

  async findPrimaryEmailByRelayEmail(
    relayAddress: string,
  ): Promise<string | null> {
    // Try cache first
    const cachedEmail =
      await this.cacheService.getPrimaryEmailByRelayEmail(relayAddress);

    if (cachedEmail) {
      return cachedEmail;
    }

    // If not in cache, query database
    const relayEmail = await this.relayEmailRepository.findOne({
      where: { relayAddress },
    });

    if (!relayEmail) {
      return null;
    }

    // Cache for future requests
    await this.cacheService.storeRelayEmailMapping(
      relayAddress,
      relayEmail.primaryEmail,
    );

    return relayEmail.primaryEmail;
  }

  async processIncomingEmails(): Promise<void> {
    const startTime = Date.now();

    try {
      const messages = await this.sqsService.receiveMessages(10);

      if (messages.length === 0) {
        this.logger.log('No exists messages in the queue');
        return;
      }

      this.logger.log(`Processing ${messages.length} SQS messages in parallel`);

      // Process all messages in parallel using Promise.allSettled
      const results = await Promise.allSettled(
        messages.map(async (message) => {
          const messageStartTime = Date.now();

          try {
            await this.processMessage(message);

            // Delete message from queue after successful processing
            if (message.ReceiptHandle) {
              await this.sqsService.deleteMessage(message.ReceiptHandle);
            }

            const messageElapsed = Date.now() - messageStartTime;
            this.logger.log(
              `Successfully processed message ${message.MessageId} in ${messageElapsed}ms`
            );

            return {
              success: true,
              messageId: message.MessageId,
              elapsed: messageElapsed
            };
          } catch (error) {
            const messageElapsed = Date.now() - messageStartTime;
            this.logger.error(
              `Failed to process message ${message.MessageId} after ${messageElapsed}ms: ${error.message}`,
              error.stack,
            );
            throw error;
          }
        })
      );

      // Summary logging
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const totalElapsed = Date.now() - startTime;

      this.logger.log(
        `Batch processing completed: ${succeeded} succeeded, ${failed} failed in ${totalElapsed}ms`
      );

    } catch (error) {
      const totalElapsed = Date.now() - startTime;
      this.logger.error(
        `Failed to process incoming emails after ${totalElapsed}ms: ${error.message}`,
        error.stack,
      );
    }
  }

  private async processMessage(message: Message): Promise<void> {
    const s3Event = this.sqsService.parseS3Event(message);

    if (!s3Event || !s3Event.Records || s3Event.Records.length === 0) {
      this.logger.warn('No S3 event records found in message');
      return;
    }

    this.logger.debug(`Processing ${s3Event.Records.length} S3 records in parallel`);

    // Process all S3 records in parallel
    await Promise.all(
      s3Event.Records.map(record => this.processS3Record(record))
    );
  }

  private async processS3Record(record: S3EventRecord): Promise<void> {
    const startTime = Date.now();

    try {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      const region = record.awsRegion;

      this.logger.debug(`Processing S3 record: s3://${bucket}/${key}`);

      // Fetch email from S3
      const s3StartTime = Date.now();
      const emailBuffer = await this.s3Service.getObject(bucket, key);
      const s3Elapsed = Date.now() - s3StartTime;

      // Parse email
      const parseStartTime = Date.now();
      const parsedMail = await simpleParser(emailBuffer);
      const parseElapsed = Date.now() - parseStartTime;

      // Extract relay address (to address)
      const toAddress = this.getOriginalRecipient(parsedMail);
      if (!toAddress) {
        this.logger.warn('No recipient address found in email');
        return;
      }

      // Find primary email from cache or database
      const dbStartTime = Date.now();
      const primaryEmail = await this.findPrimaryEmail(toAddress);
      const dbElapsed = Date.now() - dbStartTime;

      if (!primaryEmail) {
        this.logger.warn(
          `No primary email found for relay address: ${toAddress}`,
        );
        return;
      }

      // Forward email to primary address
      const forwardStartTime = Date.now();
      await this.forwardEmail(primaryEmail, parsedMail);
      const forwardElapsed = Date.now() - forwardStartTime;

      const totalElapsed = Date.now() - startTime;

      this.logger.log(
        `S3 record processed in ${totalElapsed}ms (S3: ${s3Elapsed}ms, Parse: ${parseElapsed}ms, DB: ${dbElapsed}ms, Forward: ${forwardElapsed}ms) - ${key}`
      );

    } catch (error) {
      const totalElapsed = Date.now() - startTime;
      this.logger.error(
        `Failed to process S3 record after ${totalElapsed}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
  
  private async forwardEmail(to: string, mail: ParsedMail) {
    try {
      this.logger.debug({ mail }, 'parsed mail');
      const subject = mail?.subject || '(No Subject)';
      const from = this.getSender(mail);
      const toRelay = this.getOriginalRecipient(mail);
      const toPrimary = to;
      if (!from) {
        throw new BadRequestException('Sender address not found');
      }

      // Build HTML header for forwarding information
      const htmlHeader = `
        <div style="max-width: 100%; margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 1px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);">
            <div style="background-color: #ffffff; border-radius: 7px; padding: 12px 16px;">
              <!-- From and To info -->
              <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="display: inline-flex; align-items: center; background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%); padding: 4px 10px; border-radius: 6px; font-size: 12px;">
                  <span style="color: #667eea; margin-right: 4px;">▸</span>
                  <span style="color: #4a5568; font-weight: 600;">From:</span>
                  <span style="color: #2d3748; margin-left: 6px; font-weight: 500;">${this.escapeHtml(from)}</span>
                </div>
                <div style="display: inline-flex; align-items: center; background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%); padding: 4px 10px; border-radius: 6px; font-size: 12px;">
                  <span style="color: #667eea; margin-right: 4px;">▸</span>
                  <span style="color: #4a5568; font-weight: 600;">To:</span>
                  <span style="color: #2d3748; margin-left: 6px; font-weight: 500;">${this.escapeHtml(toRelay || '')}</span>
                </div>
              </div>

              <!-- Footer with link -->
              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                <div style="font-size: 11px; color: #a0aec0;">
                  <span style="opacity: 0.7;">🔒 forwarded by</span>
                  <a href="https://private-mailhub.com" style="color: #667eea; text-decoration: none; font-weight: 600; margin-left: 4px; transition: color 0.2s;" target="_blank">Private-mailhub</a>
                </div>
                <div style="font-size: 10px; color: #cbd5e0; letter-spacing: 0.5px;">
                  ✓ SECURED
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Prepare HTML body (always use HTML format with fancy header)
      let htmlBody: string;

      if (mail?.html) {
        // Original email is HTML
        htmlBody = htmlHeader + mail.html;
      } else if (mail?.text) {
        // Original email is plain text - convert to HTML
        htmlBody = htmlHeader + `<pre style="white-space: pre-wrap; font-family: inherit;">${this.escapeHtml(mail.text)}</pre>`;
      } else {
        // No content
        htmlBody = htmlHeader + '<p>(No content)</p>';
      }

      // Parse attachments
      const attachments = this.parseAttachments(mail);

      if (attachments.length > 0) {
        this.logger.log(`Forwarding email with ${attachments.length} attachment(s)`);
      }

      // Send email via SES (HTML only)
      await this.sendMailService.sendMail({
        to: toPrimary,
        from,
        subject,
        htmlBody,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

    } catch (error) {
      this.logger.error(
        `Failed to forward email to ${to} from ${mail?.from}, error=${error.message}`,
        error.stack,
      );

      return;
    }
  }

  /**
   * Escape HTML special characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    const htmlEscapeMap: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
  }

  /**
   * Parse attachments from ParsedMail object
   */
  private parseAttachments(mail: ParsedMail): Array<{
    filename: string;
    content: Buffer;
    contentType: string;
    contentDisposition?: string;
    cid?: string;
  }> {
    try {
      if (!mail.attachments || mail.attachments.length === 0) {
        return [];
      }

      return mail.attachments.map((attachment) => ({
        filename: attachment.filename || 'unnamed',
        content: attachment.content,
        contentType: attachment.contentType,
        contentDisposition: attachment.contentDisposition,
        cid: attachment.cid,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to parse attachments: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  private async findPrimaryEmail(relayAddress: string): Promise<string> {
    try {
      // Check cache first
      const cachedPrimaryEmail = await this.cacheService.getPrimaryEmailByRelayEmail(relayAddress);
      // If does not exists in the cache, find one in the database and store it
      if (!cachedPrimaryEmail) {
        this.logger.debug('no hit cache, request db..');
        const entity = await this.relayEmailRepository.findOne({ where: { relayAddress, isActive: true }});
        if (!entity) {
          this.logger.error(`Failed to find primary email address by relay address=${relayAddress}`);
          throw new BadRequestException();
        }
        await this.cacheService.storeRelayEmailMapping(relayAddress, entity.primaryEmail);
        return entity.primaryEmail;
      }
      return cachedPrimaryEmail;
    } catch (error) {
      this.logger.error(
        `Failed to find primary email for ${relayAddress}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findRelayEmailWithUserId(
    relayAddress: string,
  ): Promise<RelayEmail | null> {
    return await this.relayEmailRepository.findOne({
      where: { relayAddress },
    });
  }

  async findByUser(userId: bigint): Promise<RelayEmail[]> {
    return await this.relayEmailRepository.find({
      where: { userId },
    });
  }

  async findById(id: bigint, userId: bigint): Promise<RelayEmail | null> {
    return await this.relayEmailRepository.findOne({
      where: { id, userId },
    });
  }

  async deleteRelayEmail(id: bigint, userId: bigint): Promise<void> {
    const relayEmail = await this.findById(id, userId);

    if (!relayEmail) {
      throw new NotFoundException('Relay email not found');
    }

    // Delete from database (soft delete via TypeORM)
    await this.relayEmailRepository.softRemove(relayEmail);

    // Remove from cache
    await this.cacheService.deleteRelayEmailMapping(relayEmail.relayAddress);
  }

  async incrementForwardCount(relayAddress: string): Promise<void> {
    await this.relayEmailRepository.increment(
      { relayAddress },
      'forwardCount',
      1,
    );

    await this.relayEmailRepository.update(
      { relayAddress },
      { lastForwardedAt: new Date() },
    );
  }

  async countByUser(userId: bigint): Promise<number> {
    return await this.relayEmailRepository.count({
      where: { userId },
    });
  }

  async updateDescription(
    id: bigint,
    userId: bigint,
    description: string,
  ): Promise<RelayEmail> {
    const relayEmail = await this.findById(id, userId);

    if (!relayEmail) {
      throw new NotFoundException('Relay email not found');
    }

    relayEmail.description = description;
    return await this.relayEmailRepository.save(relayEmail);
  }

  async updateActiveStatus(
    id: bigint,
    userId: bigint,
    isActive: boolean,
  ): Promise<RelayEmail> {
    const relayEmail = await this.findById(id, userId);

    if (!relayEmail) {
      throw new NotFoundException('Relay email not found');
    }

    relayEmail.isActive = isActive;
    return await this.relayEmailRepository.save(relayEmail);
  }

  private getSender(mail: ParsedMail): string | null {
    try {
      // Try to get from 'from' field first
      if (mail.from?.value && Array.isArray(mail.from.value) && mail.from.value.length > 0) {
        const senderAddress = mail.from.value[0]?.address;
        if (senderAddress) {
          return senderAddress;
        }
      }

      // Fallback to Return-Path header
      const returnPath = mail.headers.get('return-path');
      if (returnPath) {
        const returnPathValue = typeof returnPath === 'string'
          ? returnPath
          : returnPath.toString();

        // Extract email from Return-Path (format: <email@example.com>)
        const emailMatch = returnPathValue.match(/<(.+?)>|([^\s<>]+@[^\s<>]+)/);
        if (emailMatch) {
          return emailMatch[1] || emailMatch[2];
        }
      }

      this.logger.warn('No sender address found in email');
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to parse sender from email: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  private getOriginalRecipient(mail: ParsedMail): string | null {
    try {
      const addressObject = mail.to;

      if (!addressObject) {
        this.logger.warn('No recipient address object found in email');
        return null;
      }

      // Handle both single AddressObject and array of AddressObjects
      const addressArray = Array.isArray(addressObject)
        ? addressObject
        : [addressObject];

      // Find first valid email address
      for (const addr of addressArray) {
        if (addr?.value && Array.isArray(addr.value) && addr.value.length > 0) {
          const recipientAddress = addr.value[0]?.address;
          if (recipientAddress) {
            return recipientAddress;
          }
        }
      }

      this.logger.warn('No valid recipient address found in email');
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to parse recipient from email: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }
}
