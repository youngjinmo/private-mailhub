import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelayEmailsController } from './relay-emails.controller';
import { RelayEmailsService } from './relay-emails.service';
import { RelayEmail } from './entities/relay-email.entity';
import { CacheModule } from '../cache/cache.module';
import { UsersModule } from '../users/users.module';
import { AwsModule } from '../aws/aws.module';
import { QueuePollerService } from './queue-poller.service';

@Module({
  imports: [TypeOrmModule.forFeature([RelayEmail]), CacheModule, UsersModule, AwsModule],
  controllers: [RelayEmailsController],
  providers: [RelayEmailsService, QueuePollerService],
  exports: [RelayEmailsService],
})
export class RelayEmailsModule {}
