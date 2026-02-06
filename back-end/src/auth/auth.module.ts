import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './jwt/token.service';
import { CacheModule } from '../cache/cache.module';
import { UsersModule } from '../users/users.module';
import { AwsModule } from '../aws/aws.module';
import { CustomEnvService } from '../config/custom-env.service';
import { ProtectionUtil } from 'src/common/utils/protection.util';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (customEnvService: CustomEnvService) => {
        const secret = customEnvService.get<string>('JWT_SECRET');
        const expiresIn = customEnvService.get<number>(
          'JWT_ACCESS_TOKEN_EXPIRATION',
        );

        return {
          secret,
          signOptions: {
            expiresIn: `${expiresIn}ms`,
          },
        };
      },
      inject: [CustomEnvService],
    }),
    CacheModule,
    UsersModule,
    AwsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, ProtectionUtil],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
