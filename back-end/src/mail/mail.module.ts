import { Module } from '@nestjs/common';
import { MailgunService } from './mailgun.service';

@Module({
  providers: [MailgunService],
  exports: [MailgunService],
})
export class MailModule {}
