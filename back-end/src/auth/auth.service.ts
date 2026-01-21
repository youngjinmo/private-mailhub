import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { TokenService } from './jwt/token.service';
import { CacheService } from '../cache/cache.service';
import { UsersService } from '../users/users.service';
import { SendMailService } from '../aws/ses/send-mail.service';
import { CustomEnvService } from '../config/custom-env.service';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private tokenService: TokenService,
    private cacheService: CacheService,
    private usersService: UsersService,
    private sendMailService: SendMailService,
    private customEnvService: CustomEnvService,
  ) {}

  async sendVerificationCode(username: string): Promise<void> {
    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the code in Redis with TTL
    const ttl = this.customEnvService.getWithDefault('VERIFICATION_CODE_EXPIRATION', 300000);

    await this.cacheService.storeVerificationCode(username, code, ttl);

    // Reset verification attempts
    this.cacheService.resetVerificationAttempts(username);

    // Send the code via email
    await this.sendMailService.sendVerificationCode(username, code);
  }

  async verifyCodeAndLogin(dto: LoginDto): Promise<TokenResponseDto> {
    const { username, code } = dto;
    // Check verification attempts
    const maxAttempts = this.customEnvService.getWithDefault<number>('VERIFICATION_CODE_MAX_ATTEMPTS', 3);
    const attempts =
      await this.cacheService.getVerificationAttempts(username);

    if (maxAttempts && attempts >= maxAttempts) {
      throw new HttpException(
        'Too many failed attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Get stored verification code
    const storedCode = await this.cacheService.getVerificationCode(username);

    if (!storedCode) {
      throw new BadRequestException(
        'Verification code not found or expired. Please request a new code.',
      );
    }

    // Verify the code
    if (storedCode !== code) {
      // Increment failed attempts
      const ttl = this.customEnvService.getWithDefault(
        'VERIFICATION_CODE_EXPIRATION',
        300000,
      );
      await this.cacheService.incrementVerificationAttempts(username, ttl);
      throw new UnauthorizedException('Invalid verification code');
    }

    // Code is valid - clean up
    await this.cacheService.deleteVerificationCode(username);
    await this.cacheService.resetVerificationAttempts(username);

    // Check if user exists, if not create new user
    let user = await this.usersService.findByUsername(username);

    if (!user) {
      user = await this.usersService.createEmailUser(username);
      // Send welcome email
      await this.sendMailService.sendWelcomeEmail(username);
    }
    // update last_logined_at
    await this.usersService.updateUser(username, { lastLoginedAt: new Date() });

    // Generate tokens
    const { accessToken, refreshToken } = this.tokenService.generateTokens(
      user.id,
      user.username,
    );

    // Store refresh token in Redis
    const refreshTtl = this.customEnvService.get<number>(
      'JWT_REFRESH_TOKEN_EXPIRATION',
    );

    await this.cacheService.storeRefreshToken(
      user.id,
      refreshToken,
      refreshTtl,
    );

    return { accessToken, refreshToken }; // Refresh token will be set in HTTP-only cookie by controller
  }

  verifyToken(accessToken: string): bigint {
    return this.tokenService.getUserIdFromToken(accessToken);
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      // Validate refresh token
      const payload = this.tokenService.validateToken(refreshToken);
      const userId = BigInt(payload.sub);

      // Check if refresh token exists in Redis
      const isValid = await this.cacheService.validateRefreshToken(
        userId,
        refreshToken,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      // Generate new access token
      const newAccessToken = this.tokenService.generateAccessToken(
        userId,
        payload.username,
      );

      return newAccessToken;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: bigint): Promise<void> {
    // Remove refresh token from Redis
    await this.cacheService.deleteRefreshToken(userId);
    // Remove session if exists
    await this.cacheService.deleteSession(userId);
  }

  getRefreshToken(userId: bigint, username: string): string {
    return this.tokenService.generateRefreshToken(userId, username);
  }
}
