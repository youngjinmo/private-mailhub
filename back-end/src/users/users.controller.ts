import {
  Controller,
  Get,
  Delete,
  Put,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CacheService } from '../cache/cache.service';
import { SendMailService } from '../aws/ses/send-mail.service';
import { CustomEnvService } from '../config/custom-env.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ChangeUsernameDto } from './dto/change-username.dto';
import { VerifyUsernameChangeDto } from './dto/verify-username-change.dto';
import { SecureUtil } from 'src/common/utils/secure.util';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private cacheService: CacheService,
    private sendMailService: SendMailService,
    private customEnvService: CustomEnvService,
    private secureUtil: SecureUtil,
  ) {}

  @Public()
  @Get('exists/:username')
  @HttpCode(HttpStatus.OK)
  async checkUsernameExists(
    @Param('username') username: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.usersService.existsByUsernameHash(username);
    return { exists };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(
    @CurrentUser() currentUser: { userId: bigint; username: string },
  ): Promise<any> {
    const user = await this.usersService.findById(currentUser.userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return {
      username: user.username,
      subscriptionTier: user.subscriptionTier,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  @Put('me/username')
  @HttpCode(HttpStatus.OK)
  async requestUsernameChange(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: ChangeUsernameDto,
  ): Promise<{ message: string }> {
    const { newUsername } = dto;

    // Check if new username is same as current
    if (this.secureUtil.hash(newUsername) === currentUser.usernameHash) {
      throw new BadRequestException('New username is same as current username');
    }

    // Check if username already exists
    const exists = await this.usersService.existsByUsernameHash(newUsername);
    if (exists) {
      throw new BadRequestException('Username already exists');
    }

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the code and new username in Redis
    const ttl = this.customEnvService.getWithDefault(
      'VERIFICATION_CODE_EXPIRATION',
      300000,
    );
    const key = `username_change:${currentUser.userId.toString()}`;
    await this.cacheService.set(
      key,
      JSON.stringify({ newUsername, code }),
      ttl,
    );

    // Send verification code to new email
    await this.sendMailService.sendUsernameChangeVerificationCode(
      newUsername,
      code,
    );

    return { message: 'Verification code sent to new email' };
  }

  @Post('me/username/verify')
  @HttpCode(HttpStatus.OK)
  async verifyUsernameChange(
    @CurrentUser() currentUser: { userId: bigint; username: string },
    @Body() dto: VerifyUsernameChangeDto,
  ): Promise<{ message: string }> {
    const { code } = dto;

    // Get stored data from Redis
    const key = `username_change:${currentUser.userId.toString()}`;
    const storedData = await this.cacheService.get<string>(key);

    if (!storedData) {
      throw new BadRequestException(
        'Verification code not found or expired. Please request a new code.',
      );
    }

    const { newUsername, code: storedCode } = JSON.parse(storedData);

    // Verify the code
    if (storedCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    // Change username
    await this.usersService.updateUsername(currentUser.userId, newUsername);

    // Clean up Redis
    await this.cacheService.del(key);

    // Send notification to old email (optional)
    await this.sendMailService.sendUsernameChangedNotification(
      this.secureUtil.decrypt(currentUser.username),
      newUsername,
    );

    return { message: 'Username changed successfully' };
  }

  @Post('me/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateAccount(
    @CurrentUser() currentUser: { userId: bigint; username: string },
  ): Promise<{ message: string }> {
    await this.usersService.deactivateAccount(currentUser.userId);
    return { message: 'Account deactivated successfully' };
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteCurrentUser(
    @CurrentUser() user: { userId: bigint; username: string },
  ): Promise<{ message: string }> {
    await this.usersService.deleteUser(user.userId);
    return { message: 'User deleted successfully' };
  }
}
