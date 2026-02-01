import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Public()
  @Get('exists/:username')
  @HttpCode(HttpStatus.OK)
  async checkUsernameExists(
    @Param('username') username: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.usersService.existsByUsername(username);
    return { exists };
  }

  @Post('/deactivate')
  async deactivateUser(
    @CurrentUser() user: { userId: bigint; username: string },
  ): Promise<{ message: string }> {
    await this.usersService.deactivateUser(user.userId);
    return { message: 'User deactivated successfully' };
  }

  @Delete('')
  @HttpCode(HttpStatus.OK)
  async deleteCurrentUser(
    @CurrentUser() user: { userId: bigint; username: string },
  ): Promise<{ message: string }> {
    await this.usersService.deleteUser(user.userId);
    return { message: 'User deleted successfully' };
  }
}
