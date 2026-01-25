import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../strategies/jwt.strategy';
// config
import { CustomEnvService } from '../../config/custom-env.service';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private customEnvService: CustomEnvService,
  ) {}

  generateAccessToken(userId: bigint): string {
    const secret = this.customEnvService.get<string>('JWT_SECRET');
    const expiresIn = this.customEnvService.get<number>('JWT_ACCESS_TOKEN_EXPIRATION');
    const payload: JwtPayload = {
      sub: userId.toString()
    };

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: `${expiresIn}ms`,
    });
  }

  generateRefreshToken(userId: bigint): string {
    const secret = this.customEnvService.get<string>('JWT_SECRET');
    const expiresIn = this.customEnvService.get<number>('JWT_REFRESH_TOKEN_EXPIRATION');
    const payload: JwtPayload = {
      sub: userId.toString()
    };

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: `${expiresIn}ms`,
    });
  }

  generateTokens(userId: bigint) {
    return {
      accessToken: this.generateAccessToken(userId),
      refreshToken: this.generateRefreshToken(userId),
    };
  }

  validateToken(token: string): JwtPayload {
    const secret = this.customEnvService.get<string>('JWT_SECRET');
    return this.jwtService.verify(token, { secret });
  }

  getUserIdFromToken(token: string): bigint {
    const payload = this.validateToken(token);
    return BigInt(payload.sub);
  }
}
