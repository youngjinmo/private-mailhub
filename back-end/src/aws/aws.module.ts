import { Module } from '@nestjs/common';
import { SesService } from './ses/ses.service';
import { SendMailService } from './ses/send-mail.service';
import { S3Service } from './s3/s3.service';
import { SqsService } from './sqs/sqs.service';

@Module({
  providers: [SesService, SendMailService, S3Service, SqsService],
  exports: [SesService, SendMailService, S3Service, SqsService],
})
export class AwsModule {}
