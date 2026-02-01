import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../../auth/jwt/token.service';
import { CacheService } from '../../cache/cache.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { Request, Response } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const accessToken = this.extractTokenFromHeader(request);

    if (!accessToken) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Validate access token (checks expiration and signature)
      const payload = this.tokenService.parsePayloadFromToken(accessToken);

      // Check if session exists in cache (accessToken -> refreshToken)
      const hasSession = await this.cacheService.hasSession(accessToken);
      if (!hasSession) {
        throw new UnauthorizedException('Session not found');
      }

      // Set user in request
      request.user = {
        userId: payload.userId,
        username: payload.username,
      };

      return true;
    } catch (error) {
      // Check if token is expired
      if (error?.name === 'TokenExpiredError') {
        return this.handleTokenRefresh(request, response, accessToken);
      }

      this.logger.warn(
        `Authentication failed for ${request.method} ${request.url}: ${error?.message}`,
      );
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private async handleTokenRefresh(
    request: Request,
    response: Response,
    expiredAccessToken: string,
  ): Promise<boolean> {
    // Check if session exists for expired token
    const hasSession = await this.cacheService.hasSession(expiredAccessToken);
    if (!hasSession) {
      this.logger.debug('Session not found for expired token');
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    // Decode expired token to get user info (without validation)
    const payload = this.tokenService.decodeToken(expiredAccessToken);
    if (!payload) {
      this.logger.debug('Failed to decode expired token');
      throw new UnauthorizedException('Invalid token');
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      this.tokenService.generateTokens(payload.userId, payload.username);

    // Delete old session and create new one
    await this.cacheService.delSession(expiredAccessToken);
    await this.cacheService.setSession(newAccessToken, newRefreshToken);

    // Set new access token in response header
    response.setHeader('X-New-Access-Token', newAccessToken);

    // Set user in request
    request.user = {
      userId: payload.userId,
      username: payload.username,
    };

    this.logger.log(`Tokens refreshed for user ${payload.username}`);
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
