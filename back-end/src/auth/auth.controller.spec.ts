import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, UnauthorizedException, BadRequestException, HttpException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CustomEnvService } from '../config/custom-env.service';
import type { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let customEnvService: jest.Mocked<CustomEnvService>;

  // Mock response object
  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  // Test data
  const testUser = {
    username: 'test@example.com',
    userId: BigInt(1),
  };

  const testTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            sendVerificationCode: jest.fn(),
            verifyCodeAndLogin: jest.fn(),
            logout: jest.fn(),
          },
        },
        {
          provide: CustomEnvService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    customEnvService = module.get(CustomEnvService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/send-verification-code', () => {
    /**
     * Sends a 6-digit verification code to the user's email.
     * This is the first step of the passwordless authentication flow.
     */

    it('should send verification code successfully and return success message', async () => {
      // Arrange
      authService.sendVerificationCode.mockResolvedValue(undefined);

      // Act
      const result = await controller.sendVerificationCode({
        username: testUser.username,
      });

      // Assert
      expect(result).toEqual({ message: 'Verification code sent successfully' });
      expect(authService.sendVerificationCode).toHaveBeenCalledWith(testUser.username);
      expect(authService.sendVerificationCode).toHaveBeenCalledTimes(1);
    });

    it('should propagate error when email service fails', async () => {
      // Arrange
      authService.sendVerificationCode.mockRejectedValue(
        new Error('Failed to send email'),
      );

      // Act & Assert
      await expect(
        controller.sendVerificationCode({ username: testUser.username }),
      ).rejects.toThrow('Failed to send email');
    });
  });

  describe('POST /auth/login', () => {
    /**
     * Verifies the 6-digit code and authenticates the user.
     * Returns access token in response body and sets refresh token in HTTP-only cookie.
     * Creates a new user account if the email doesn't exist.
     */

    it('should login successfully and return access token with refresh token cookie', async () => {
      // Arrange
      authService.verifyCodeAndLogin.mockResolvedValue(testTokens);
      customEnvService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'JWT_REFRESH_TOKEN_EXPIRATION') return 604800000; // 7 days
        return undefined;
      });

      // Act
      const result = await controller.login(
        { username: testUser.username, code: '123456' },
        mockResponse,
      );

      // Assert
      expect(result).toEqual({ accessToken: testTokens.accessToken });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        testTokens.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        }),
      );
      expect(authService.verifyCodeAndLogin).toHaveBeenCalledWith({
        username: testUser.username,
        code: '123456',
      });
    });

    it('should set secure cookie to false in development environment', async () => {
      // Arrange
      authService.verifyCodeAndLogin.mockResolvedValue(testTokens);
      customEnvService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'JWT_REFRESH_TOKEN_EXPIRATION') return 604800000;
        return undefined;
      });

      // Act
      await controller.login(
        { username: testUser.username, code: '123456' },
        mockResponse,
      );

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        testTokens.refreshToken,
        expect.objectContaining({
          secure: false,
        }),
      );
    });

    it('should throw BadRequestException when verification code is expired or not found', async () => {
      // Arrange
      authService.verifyCodeAndLogin.mockRejectedValue(
        new BadRequestException('Verification code not found or expired. Please request a new code.'),
      );

      // Act & Assert
      await expect(
        controller.login(
          { username: testUser.username, code: '123456' },
          mockResponse,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.login(
          { username: testUser.username, code: '123456' },
          mockResponse,
        ),
      ).rejects.toThrow('Verification code not found or expired. Please request a new code.');
    });

    it('should throw UnauthorizedException when verification code is invalid', async () => {
      // Arrange
      authService.verifyCodeAndLogin.mockRejectedValue(
        new UnauthorizedException('Invalid verification code'),
      );

      // Act & Assert
      await expect(
        controller.login(
          { username: testUser.username, code: 'wrong-code' },
          mockResponse,
        ),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.login(
          { username: testUser.username, code: 'wrong-code' },
          mockResponse,
        ),
      ).rejects.toThrow('Invalid verification code');
    });

    it('should throw TooManyRequests (429) when max verification attempts exceeded', async () => {
      // Arrange
      authService.verifyCodeAndLogin.mockRejectedValue(
        new HttpException(
          'Too many failed attempts. Please request a new code.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      // Act & Assert
      await expect(
        controller.login(
          { username: testUser.username, code: '123456' },
          mockResponse,
        ),
      ).rejects.toThrow(HttpException);
      await expect(
        controller.login(
          { username: testUser.username, code: '123456' },
          mockResponse,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });
  });

  describe('POST /auth/logout', () => {
    /**
     * Logs out the authenticated user.
     * Invalidates the refresh token and clears the refresh token cookie.
     * Requires authentication (JWT token in Authorization header).
     */

    it('should logout successfully, clear cookie, and return success message', async () => {
      // Arrange
      authService.logout.mockResolvedValue(undefined);
      const currentUser = { userId: testUser.userId, username: testUser.username };

      // Act
      const result = await controller.logout(currentUser, mockResponse);

      // Assert
      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(authService.logout).toHaveBeenCalledWith(testUser.userId);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
    });

    it('should propagate error when logout fails', async () => {
      // Arrange
      authService.logout.mockRejectedValue(new Error('Cache service error'));
      const currentUser = { userId: testUser.userId, username: testUser.username };

      // Act & Assert
      await expect(controller.logout(currentUser, mockResponse)).rejects.toThrow(
        'Cache service error',
      );
    });
  });
});
