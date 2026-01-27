import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TokenService } from './jwt/token.service';
import { CacheService } from '../cache/cache.service';
import { UsersService } from '../users/users.service';
import { SendMailService } from '../aws/ses/send-mail.service';
import { CustomEnvService } from '../config/custom-env.service';
import { CodeUtil } from '../common/utils/code.util';
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
    const code = CodeUtil.generateVerificationCode();

    // Store the code in Redis with TTL
    const ttl = this.customEnvService.getWithDefault('VERIFICATION_CODE_EXPIRATION', 300000);

    await this.storeVerificationCode(username, code, ttl);

    // Reset verification attempts
    this.resetVerificationAttempts(username);

    // Send the code via email
    await this.sendMailService.sendVerificationCode(username, code);
  }

  async verifyCodeAndLogin(dto: LoginDto): Promise<TokenResponseDto> {
    const { username, code } = dto;
    // Check verification attempts
    const maxAttempts = this.customEnvService.getWithDefault<number>('VERIFICATION_CODE_MAX_ATTEMPTS', 3);
    const attempts =
      await this.getVerificationAttempts(username);

    if (maxAttempts && attempts >= maxAttempts) {
      throw new HttpException(
        'Too many failed attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Get stored verification code
    const storedCode = await this.getVerificationCode(username);

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
      await this.incrementVerificationAttempts(username, ttl);
      throw new UnauthorizedException('Invalid verification code');
    }

    // Code is valid - clean up
    await this.deleteVerificationCode(username);
    await this.resetVerificationAttempts(username);

    // Check if user exists, if not create new user
    let user = await this.usersService.findByUsernameHash(username);

    if (!user) {
      user = await this.usersService.createEmailUser(username);
      // Send welcome email
      await this.sendMailService.sendWelcomeEmail(username);
    }
    // update last_logined_at
    await this.usersService.updateUserByUsernameHash(username, { lastLoginedAt: new Date() });

    // Generate tokens
    const { accessToken, refreshToken } = this.tokenService.generateTokens(user.id);

    // Store refresh token in Redis
    const refreshTtl = this.customEnvService.get<number>(
      'JWT_REFRESH_TOKEN_EXPIRATION',
    );

    await this.storeRefreshToken(user.id, refreshToken, refreshTtl);

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
      const isValid = await this.validateRefreshToken(userId, refreshToken);

      if (!isValid) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      // Generate new access token
      const newAccessToken = this.tokenService.generateAccessToken(userId);

      return newAccessToken;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: bigint): Promise<void> {
    // Remove refresh token from Redis
    await this.deleteRefreshToken(userId);
  }

  async validateRefreshToken(userId: bigint, token: string): Promise<boolean> {
    const storedToken = await this.getRefreshToken(userId);
    return storedToken === token;
  }

  // Private helper methods

  private async storeRefreshToken(
    userId: bigint,
    token: string,
    ttl: number,
  ): Promise<void> {
    const key = this.getCacheKey(userId);
    await this.cacheService.set(key, token, ttl);
  }

  private async getRefreshToken(userId: bigint): Promise<string | null> {
    const key = this.getCacheKey(userId);
    return await this.cacheService.get<string>(key);
  }

  private async deleteRefreshToken(userId: bigint): Promise<void> {
    const key = this.getCacheKey(userId);
    await this.cacheService.del(key);
  }

  private getCacheKey(userId: bigint): string {
    return `auth:refresh:token:${userId.toString()}`;
  }

  private async storeVerificationCode(
    username: string,
    code: string,
    ttl: number,
  ): Promise<void> {
    const key = this.getVerificationCodeCacheKey(username);
    await this.cacheService.set(key, code, ttl);
  }

  private async getVerificationCode(username: string): Promise<string | null> {
    const key = this.getVerificationCodeCacheKey(username);
    return await this.cacheService.get<string>(key);
  }

  private async deleteVerificationCode(username: string): Promise<void> {
    const key = this.getVerificationCodeCacheKey(username);
    await this.cacheService.del(key);
  }

  private getVerificationCodeCacheKey(username: string): string {
    return `verification:code:${username}`;
  }

  private async getVerificationAttempts(username: string): Promise<number> {
    const key = this.getVerificationAttemptCacheKey(username);
    const attempts = await this.cacheService.get<number>(key);
    return attempts || 0;
  }

  private async incrementVerificationAttempts(
    username: string,
    ttl: number,
  ): Promise<number> {
    const key = this.getVerificationAttemptCacheKey(username);
    const currentAttempts = await this.getVerificationAttempts(username);
    const newAttempts = currentAttempts + 1;
    await this.cacheService.set(key, newAttempts, ttl);
    return newAttempts;
  }

  private async resetVerificationAttempts(username: string): Promise<void> {
    const key = this.getVerificationAttemptCacheKey(username);
    await this.cacheService.del(key);
  }

  private getVerificationAttemptCacheKey(username: string): string {
    return `verification:attempts:${username}`;
  }
}
