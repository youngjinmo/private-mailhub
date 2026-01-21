import { Controller, Post, Body, Res, Req, HttpCode, HttpStatus, UnauthorizedException, Logger, Query } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CustomEnvService } from '../config/custom-env.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private customEnvService: CustomEnvService,
  ) {}

  @Public()
  @Post('send-verification-code')
  @HttpCode(HttpStatus.OK)
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto): Promise<{ message: string }> {
    await this.authService.sendVerificationCode(dto.username);
    return { message: 'Verification code sent successfully' };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<AuthResponseDto> {
    const { accessToken, refreshToken } = await this.authService.verifyCodeAndLogin(dto);

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.customEnvService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: this.customEnvService.get<number>('JWT_REFRESH_TOKEN_EXPIRATION'),
    });

    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: { userId: bigint; username: string }, @Res({ passthrough: true }) response: Response): Promise<{ message: string }> {
    await this.authService.logout(user.userId);

    // Clear refresh token cookie
    response.clearCookie('refreshToken');

    return { message: 'Logged out successfully' };
  }
}
