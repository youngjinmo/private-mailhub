import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CustomEnvService } from '../config/custom-env.service';
import { createKeyv } from '@keyv/redis';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: async (customEnvService: CustomEnvService) => ({
        stores: [
          createKeyv(
            `redis://${customEnvService.get<string>('REDIS_HOST')}:${customEnvService.get<string>('REDIS_PORT')}`
          )
        ],
        isGlobal: true,
      }),
      inject: [CustomEnvService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
