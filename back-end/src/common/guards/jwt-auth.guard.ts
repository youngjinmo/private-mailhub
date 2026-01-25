import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';
import { UserStaus } from '../enums/user-status.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../../auth/jwt/token.service';
import type { Response } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private tokenService: TokenService,
    private authService: AuthService,
    private usersService: UsersService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      const result = await super.canActivate(context);

      if (!result) {
        throw new UnauthorizedException('Authentication required');
      }

      // At this point, request.user is set by JwtStrategy.validate
      const user = request.user;

      if (!user || !user.userId) {
        throw new UnauthorizedException('Authentication required');
      }

      // Fetch full user data from DB and set complete CurrentUserPayload
      try {
        const dbUser = await this.usersService.findById(user.userId);

        if (!dbUser) {
          throw new UnauthorizedException('User not found');
        }

        if (dbUser.status === UserStaus.DEACTIVATED) {
          throw new ForbiddenException('Account has been deactivated');
        }

        if (dbUser.status === UserStaus.DELETED) {
          throw new ForbiddenException('Account has been deleted');
        }

        // Set complete CurrentUserPayload in request.user
        request.user = {
          userId: dbUser.id,
          username: dbUser.username,
          usernameHash: dbUser.usernameHash,
          role: dbUser.role,
        };
      } catch (error) {
        if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
          throw error;
        }
        this.logger.error(`Error checking account status: ${error.message}`);
        throw new UnauthorizedException('Authentication failed');
      }

      return true;
    } catch (error) {
      // Check if the error is related to token expiration
      if (error?.message?.includes('expired') || error?.name === 'TokenExpiredError') {
        const refreshToken = request.cookies?.refreshToken;

        if (refreshToken) {
          try {
            // Validate refresh token
            const payload = this.tokenService.validateToken(refreshToken);
            const userId = BigInt(payload.sub);

            // Check if refresh token exists in Redis
            const isValid = await this.authService.validateRefreshToken(
              userId,
              refreshToken,
            );

            if (isValid) {
              // Generate new access token
              const newAccessToken = this.tokenService.generateAccessToken(userId);

              // Set new access token in response header
              response.setHeader('X-New-Access-Token', newAccessToken);

              // Fetch full user data and verify account status
              try {
                const dbUser = await this.usersService.findById(userId);

                if (!dbUser) {
                  throw new UnauthorizedException('User not found');
                }

                if (dbUser.status === UserStaus.DEACTIVATED) {
                  throw new ForbiddenException('Account has been deactivated');
                }

                if (dbUser.status === UserStaus.DELETED) {
                  throw new ForbiddenException('Account has been deleted');
                }

                // Set complete CurrentUserPayload in request.user
                request.user = {
                  userId: dbUser.id,
                  username: dbUser.username,
                  usernameHash: dbUser.usernameHash,
                  role: dbUser.role,
                };
              } catch (statusError) {
                if (statusError instanceof ForbiddenException || statusError instanceof UnauthorizedException) {
                  throw statusError;
                }
                this.logger.error(`Error checking account status: ${statusError.message}`);
                throw new UnauthorizedException('Authentication failed');
              }

              return true;
            }
          } catch (refreshError) {
            this.logger.warn(
              `Token refresh failed for ${request.method} ${request.url}: ${refreshError.message}`,
            );
            throw new UnauthorizedException('Session expired. Please login again.');
          }
        }

        this.logger.warn(
          `Token expired and no valid refresh token for ${request.method} ${request.url}`,
        );
        throw new UnauthorizedException('Session expired. Please login again.');
      }

      // Re-throw other errors
      throw error;
    }
  }
}
