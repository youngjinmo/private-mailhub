import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { CustomEnvService } from '../../config/custom-env.service';
import { TokenPayloadDto } from '../dto/token-response.dto';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private customEnvService: CustomEnvService,
  ) {}

  generateAccessToken(userId: bigint, username: string): string {
    const payload: JwtPayload = {
      sub: userId.toString(),
      username,
    };

    const secret = this.customEnvService.get<string>('JWT_SECRET');
    const expiresIn = this.customEnvService.get<number>(
      'JWT_ACCESS_TOKEN_EXPIRATION',
    );

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: `${expiresIn}ms`,
    });
  }

  generateRefreshToken(userId: bigint, username: string): string {
    const payload: JwtPayload = {
      sub: userId.toString(),
      username,
    };

    const secret = this.customEnvService.get<string>('JWT_SECRET');
    const expiresIn = this.customEnvService.get<number>(
      'JWT_REFRESH_TOKEN_EXPIRATION',
    );

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: `${expiresIn}ms`,
    });
  }

  generateTokens(userId: bigint, username: string) {
    return {
      accessToken: this.generateAccessToken(userId, username),
      refreshToken: this.generateRefreshToken(userId, username),
    };
  }

  parsePayloadFromToken(token: string): TokenPayloadDto {
    const payload = this.validateToken(token);
    return {
      userId: BigInt(payload.sub),
      username: payload.username,
    };
  }

  getUsernameFromToken(token: string): string {
    const payload = this.validateToken(token);
    return payload.username;
  }

  private validateToken(token: string): JwtPayload {
    const secret = this.customEnvService.get<string>('JWT_SECRET');
    return this.jwtService.verify(token, { secret });
  }

  // Decode token without validation (for expired tokens)
  decodeToken(token: string): TokenPayloadDto | null {
    const decoded = this.jwtService.decode(token);
    if (!decoded) {
      return null;
    }
    return {
      userId: BigInt(decoded.sub),
      username: decoded.username,
    };
  }
}
