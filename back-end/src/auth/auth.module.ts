import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './jwt/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CacheModule } from '../cache/cache.module';
import { UsersModule } from '../users/users.module';
import { AwsModule } from '../aws/aws.module';
import { CustomEnvService } from '../config/custom-env.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: async (customEnvService: CustomEnvService) => {
        const secret = customEnvService.get<string>('JWT_SECRET');
        const expiresIn = customEnvService.get<number>('JWT_ACCESS_TOKEN_EXPIRATION');

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
  providers: [AuthService, TokenService, JwtStrategy],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
