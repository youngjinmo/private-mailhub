import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RelayEmailsService } from 'src/relay-emails/relay-emails.service';

@Injectable()
export class QueuePollerService implements OnModuleInit {
  private readonly logger = new Logger(QueuePollerService.name);
  private isProcessing = false;

  constructor(private readonly relayEmailService: RelayEmailsService) {}

  onModuleInit() {
    this.logger.log('Queue Poller Service initialized');
    this.logger.log('Queue polling will run every 30 seconds');
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async pollSQS() {
    if (this.isProcessing) {
      this.logger.debug('Previous poll is still processing, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      await this.relayEmailService.processIncomingEmails();
    } catch (error) {
      this.logger.error(`Failed to poll SQS: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }
}
