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
import { TokenPayloadDto, CreateTokenResponseDto } from './dto/token-response.dto';
import { ProtectionUtil } from 'src/common/utils/protection.util';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly cacheService: CacheService,
    private readonly usersService: UsersService,
    private readonly sendMailService: SendMailService,
    private readonly customEnvService: CustomEnvService,
    private readonly protectionUtil: ProtectionUtil,
  ) {}

  async sendVerificationCode(encryptedUsername: string): Promise<void> {
    const username = this.protectionUtil.decrypt(encryptedUsername);
    const usernameHash = this.protectionUtil.hash(username);
    
    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the code in Redis with TTL
    await this.cacheService.setVerificationCode(usernameHash, code);

    // Reset verification attempts
    this.cacheService.resetVerificationAttempts(usernameHash);

    // Send the code via email
    await this.sendMailService.sendVerificationCode(username, code);
  }

  async verifyCodeAndLogin(dto: LoginDto): Promise<AuthResponseDto> {
    // username is used only for create account
    const { encryptedUsername, code } = dto;
    const usernameHash = this.protectionUtil.hash(
      this.protectionUtil.decrypt(encryptedUsername)
    );

    this.logger.debug(encryptedUsername, 'username');
    this.logger.debug(usernameHash, 'hash');

    // Check verification attempts
    const maxAttempts = this.customEnvService.getWithDefault<number>('VERIFICATION_CODE_MAX_ATTEMPTS', 3);
    const attempts =
      await this.cacheService.getVerificationAttempts(usernameHash);

    if (maxAttempts && attempts >= maxAttempts) {
      throw new HttpException(
        'Too many failed attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Get stored verification code
    const storedCode = await this.cacheService.getVerificationCode(usernameHash);

    if (!storedCode) {
      throw new BadRequestException(
        'Verification code not found or expired. Please request a new code.',
      );
    }

    // Verify the code
    if (storedCode !== code) {
      // Increment failed attempts
      await this.cacheService.incrementVerificationAttempts(usernameHash);
      throw new UnauthorizedException('Invalid verification code');
    }

    // Code is valid - clean up
    await this.cacheService.deleteVerificationCode(usernameHash);
    await this.cacheService.resetVerificationAttempts(usernameHash);

    // Check if user exists, if not create new user
    let user = await this.usersService.findByUsernameHash(usernameHash);

    if (!user) {
      user = await this.usersService.createEmailUser(encryptedUsername);
      // Send welcome email
      await this.sendMailService.sendWelcomeEmail(
        this.protectionUtil.decrypt(encryptedUsername)
      );
    }
    // update last_logined_at
    await this.usersService.updateUser(usernameHash, { lastLoginedAt: new Date() });

    // Generate tokens
    const { accessToken, refreshToken } = this.tokenService.generateTokens(
      user.id,
      user.username,
    );

    // Store session
    await this.cacheService.setSession(accessToken, refreshToken);

    return { accessToken };
  }

  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      this.parsePayloadFromToken(accessToken);
      return true;
    } catch {
      return false;
    }
  }

  parsePayloadFromToken(accessToken: string): TokenPayloadDto {
    return this.tokenService.parsePayloadFromToken(accessToken);
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      // Validate refresh token
      const { userId, username } = this.parsePayloadFromToken(refreshToken);

      // Check if refresh token exists in Redis
      const isValid = await this.validateRefreshToken(userId, refreshToken);

      if (!isValid) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      // Generate new access token
      const newAccessToken = this.tokenService.generateAccessToken(userId, username);

      return newAccessToken;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(accessToken: string): Promise<void> {
    await this.cacheService.delSession(accessToken);
  }

  generateRefreshToken(userId: bigint, username: string): string {
    return this.tokenService.generateRefreshToken(userId, username);
  }

  async validateRefreshToken(userId: bigint, token: string): Promise<boolean> {
    const session = await this.cacheService.getSession(token);
    const payload = this.parsePayloadFromToken(token);
    return session === payload.userId.toString();
  }
}
