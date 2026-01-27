import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SubscriptionTier } from '../common/enums/subscription-tier.enum';
import { UserStaus } from '../common/enums/user-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  // Test data
  const mockUser = {
    id: BigInt(1),
    username: 'test@example.com',
    usernameHash: 'hashed-username',
    role: UserRole.USER,
    subscriptionTier: SubscriptionTier.FREE,
    status: UserStaus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    deactivatedAt: null,
    lastLoginedAt: new Date('2024-01-15'),
    relayEmails: [],
  };

  const currentUser: CurrentUserPayload = {
    userId: BigInt(1),
    username: 'test@example.com',
    usernameHash: 'hashed-username',
    role: UserRole.USER,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            existsByUsernameHash: jest.fn(),
            findById: jest.fn(),
            requestUsernameChange: jest.fn(),
            verifyUsernameChange: jest.fn(),
            deactivateAccount: jest.fn(),
            deleteUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users/exists/:username', () => {
    /**
     * Checks if a username (email) is already registered.
     * This is a public endpoint used for registration validation.
     * Returns { exists: true } if the email is taken, { exists: false } otherwise.
     */

    it('should return exists: true when username is already registered', async () => {
      // Arrange
      usersService.existsByUsernameHash.mockResolvedValue(true);

      // Act
      const result = await controller.checkUsernameExists('existing@example.com');

      // Assert
      expect(result).toEqual({ exists: true });
      expect(usersService.existsByUsernameHash).toHaveBeenCalledWith('existing@example.com');
    });

    it('should return exists: false when username is not registered', async () => {
      // Arrange
      usersService.existsByUsernameHash.mockResolvedValue(false);

      // Act
      const result = await controller.checkUsernameExists('new@example.com');

      // Assert
      expect(result).toEqual({ exists: false });
      expect(usersService.existsByUsernameHash).toHaveBeenCalledWith('new@example.com');
    });
  });

  describe('GET /users/me', () => {
    /**
     * Returns the current authenticated user's profile information.
     * Requires authentication (JWT token in Authorization header).
     * Returns username, subscription tier, account status, and creation date.
     */

    it('should return current user profile information', async () => {
      // Arrange
      usersService.findById.mockResolvedValue(mockUser);

      // Act
      const result = await controller.getCurrentUser(currentUser);

      // Assert
      expect(result).toEqual({
        username: mockUser.username,
        subscriptionTier: mockUser.subscriptionTier,
        status: mockUser.status,
        createdAt: mockUser.createdAt,
      });
      expect(usersService.findById).toHaveBeenCalledWith(currentUser.userId);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      usersService.findById.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      // Act & Assert
      await expect(controller.getCurrentUser(currentUser)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getCurrentUser(currentUser)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('PUT /users/me/username', () => {
    /**
     * Initiates a username (primary email) change request.
     * Sends a verification code to the new email address.
     * Requires authentication.
     * The change is not applied until the code is verified via POST /users/me/username/verify.
     */

    it('should request username change and return success message', async () => {
      // Arrange
      usersService.requestUsernameChange.mockResolvedValue(undefined);
      const newUsername = 'newemail@example.com';

      // Act
      const result = await controller.requestUsernameChange(currentUser, {
        newUsername,
      });

      // Assert
      expect(result).toEqual({ message: 'Verification code sent to new email' });
      expect(usersService.requestUsernameChange).toHaveBeenCalledWith(
        currentUser.userId,
        currentUser.usernameHash,
        newUsername,
      );
    });

    it('should throw BadRequestException when new username is same as current username', async () => {
      // Arrange
      usersService.requestUsernameChange.mockRejectedValue(
        new BadRequestException('New username is same as current username'),
      );

      // Act & Assert
      await expect(
        controller.requestUsernameChange(currentUser, {
          newUsername: currentUser.username,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.requestUsernameChange(currentUser, {
          newUsername: currentUser.username,
        }),
      ).rejects.toThrow('New username is same as current username');
    });

    it('should throw BadRequestException when new username already exists', async () => {
      // Arrange
      usersService.requestUsernameChange.mockRejectedValue(
        new BadRequestException('Username already exists'),
      );

      // Act & Assert
      await expect(
        controller.requestUsernameChange(currentUser, {
          newUsername: 'taken@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.requestUsernameChange(currentUser, {
          newUsername: 'taken@example.com',
        }),
      ).rejects.toThrow('Username already exists');
    });
  });

  describe('POST /users/me/username/verify', () => {
    /**
     * Verifies the username change with the 6-digit code sent to the new email.
     * Upon successful verification, updates the username and all associated relay emails.
     * Sends a notification to the old email address about the change.
     * Requires authentication.
     */

    it('should verify username change and return success message', async () => {
      // Arrange
      usersService.verifyUsernameChange.mockResolvedValue(undefined);
      const verificationCode = '123456';

      // Act
      const result = await controller.verifyUsernameChange(currentUser, {
        code: verificationCode,
      });

      // Assert
      expect(result).toEqual({ message: 'Username changed successfully' });
      expect(usersService.verifyUsernameChange).toHaveBeenCalledWith(
        currentUser.userId,
        currentUser.username,
        verificationCode,
      );
    });

    it('should throw BadRequestException when verification code is expired or not found', async () => {
      // Arrange
      usersService.verifyUsernameChange.mockRejectedValue(
        new BadRequestException(
          'Verification code not found or expired. Please request a new code.',
        ),
      );

      // Act & Assert
      await expect(
        controller.verifyUsernameChange(currentUser, { code: '123456' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.verifyUsernameChange(currentUser, { code: '123456' }),
      ).rejects.toThrow('Verification code not found or expired. Please request a new code.');
    });

    it('should throw BadRequestException when verification code is invalid', async () => {
      // Arrange
      usersService.verifyUsernameChange.mockRejectedValue(
        new BadRequestException('Invalid verification code'),
      );

      // Act & Assert
      await expect(
        controller.verifyUsernameChange(currentUser, { code: 'wrong!' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.verifyUsernameChange(currentUser, { code: 'wrong!' }),
      ).rejects.toThrow('Invalid verification code');
    });
  });

  describe('POST /users/me/deactivate', () => {
    /**
     * Deactivates the current user's account.
     * Sets account status to DEACTIVATED and pauses all relay emails.
     * The user can reactivate by logging in again.
     * Requires authentication.
     */

    it('should deactivate account and return success message', async () => {
      // Arrange
      usersService.deactivateAccount.mockResolvedValue(undefined);

      // Act
      const result = await controller.deactivateAccount(currentUser);

      // Assert
      expect(result).toEqual({ message: 'Account deactivated successfully' });
      expect(usersService.deactivateAccount).toHaveBeenCalledWith(currentUser.userId);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      usersService.deactivateAccount.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      // Act & Assert
      await expect(controller.deactivateAccount(currentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('DELETE /users/me', () => {
    /**
     * Permanently deletes the current user's account (soft delete).
     * This action cannot be undone.
     * All associated relay emails will be cascade deleted.
     * Requires authentication.
     */

    it('should delete user account and return success message', async () => {
      // Arrange
      usersService.deleteUser.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteCurrentUser(currentUser);

      // Assert
      expect(result).toEqual({ message: 'User deleted successfully' });
      expect(usersService.deleteUser).toHaveBeenCalledWith(currentUser.userId);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      usersService.deleteUser.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      // Act & Assert
      await expect(controller.deleteCurrentUser(currentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate error when deletion fails', async () => {
      // Arrange
      usersService.deleteUser.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.deleteCurrentUser(currentUser)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
