import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { RelayEmail } from '../relay-emails/entities/relay-email.entity';
import { CacheModule } from '../cache/cache.module';
import { AwsModule } from '../aws/aws.module';
import { ConfigModule } from '../config/config.module';
import { SecureUtil } from '../common/utils/secure.util';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RelayEmail]),
    CacheModule,
    AwsModule,
    ConfigModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, SecureUtil],
  exports: [UsersService],
})
export class UsersModule {}
