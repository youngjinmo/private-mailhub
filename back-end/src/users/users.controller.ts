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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ChangeUsernameDto } from './dto/change-username.dto';
import { VerifyUsernameChangeDto } from './dto/verify-username-change.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

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
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    const user = await this.usersService.findById(currentUser.userId);
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
    await this.usersService.requestUsernameChange(
      currentUser.userId,
      currentUser.usernameHash,
      dto.newUsername,
    );
    return { message: 'Verification code sent to new email' };
  }

  @Post('me/username/verify')
  @HttpCode(HttpStatus.OK)
  async verifyUsernameChange(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: VerifyUsernameChangeDto,
  ): Promise<{ message: string }> {
    await this.usersService.verifyUsernameChange(
      currentUser.userId,
      currentUser.username,
      dto.code,
    );
    return { message: 'Username changed successfully' };
  }

  @Post('me/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateAccount(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<{ message: string }> {
    await this.usersService.deactivateAccount(currentUser.userId);
    return { message: 'Account deactivated successfully' };
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteCurrentUser(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<{ message: string }> {
    await this.usersService.deleteUser(currentUser.userId);
    return { message: 'User deleted successfully' };
  }
}
