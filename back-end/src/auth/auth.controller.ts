import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('send-verification-code')
  @HttpCode(HttpStatus.OK)
  async sendVerificationCode(
    @Body() dto: SendVerificationCodeDto,
  ): Promise<{ message: string; isNewUser: boolean }> {
    const { isNewUser } = await this.authService.sendVerificationCode(
      dto.encryptedUsername,
    );
    return { message: 'Verification code sent successfully', isNewUser };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const { accessToken } = await this.authService.verifyCodeAndLogin(dto);

    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request): Promise<{ message: string }> {
    const accessToken = request.headers.authorization?.split(' ')[1];
    if (accessToken) {
      await this.authService.logout(accessToken);
    }
    return { message: 'Logged out successfully' };
  }
}
