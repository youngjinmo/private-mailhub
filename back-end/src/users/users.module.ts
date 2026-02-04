import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { ProtectionUtil } from 'src/common/utils/protection.util';
import { CacheModule } from '../cache/cache.module';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CacheModule, AwsModule],
  controllers: [UsersController],
  providers: [UsersService, ProtectionUtil],
  exports: [UsersService],
})
export class UsersModule {}
