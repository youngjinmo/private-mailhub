import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { RelayEmailsController } from './relay-emails.controller';
import { RelayEmailsService } from './relay-emails.service';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

describe('RelayEmailsController', () => {
  let controller: RelayEmailsController;
  let relayEmailsService: jest.Mocked<RelayEmailsService>;

  // Test data
  const currentUser: CurrentUserPayload = {
    userId: BigInt(1),
    username: 'test@example.com',
    usernameHash: 'hashed-username',
    role: UserRole.USER,
  };

  const adminUser: CurrentUserPayload = {
    userId: BigInt(2),
    username: 'admin@example.com',
    usernameHash: 'hashed-admin',
    role: UserRole.ADMIN,
  };

  const mockRelayEmail = {
    id: BigInt(100),
    userId: BigInt(1),
    primaryEmail: 'test@example.com',
    relayEmail: 'abc123@private-mailhub.com',
    description: 'Shopping sites',
    isActive: true,
    forwardCount: BigInt(10),
    lastForwardedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    pausedAt: null,
    user: null,
  };

  const mockRelayEmailList = [
    mockRelayEmail,
    {
      ...mockRelayEmail,
      id: BigInt(101),
      relayEmail: 'def456@private-mailhub.com',
      description: 'Social media',
      isActive: false,
      forwardCount: BigInt(5),
      lastForwardedAt: null,
      pausedAt: new Date('2024-01-10'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RelayEmailsController],
      providers: [
        {
          provide: RelayEmailsService,
          useValue: {
            findByUserId: jest.fn(),
            createRelayEmailForUser: jest.fn(),
            generateCustomRelayEmailAddress: jest.fn(),
            updateDescription: jest.fn(),
            updateActiveStatus: jest.fn(),
            findPrimaryEmailWithOwnershipCheck: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RelayEmailsController>(RelayEmailsController);
    relayEmailsService = module.get(RelayEmailsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /relay-emails', () => {
    /**
     * Returns all relay email addresses owned by the authenticated user.
     * Each relay email includes: relay address, primary email, description,
     * active status, forward count, last forwarded date, creation date, and paused date.
     * Requires authentication.
     */

    it('should return all relay emails for the authenticated user', async () => {
      // Arrange
      relayEmailsService.findByUserId.mockResolvedValue(mockRelayEmailList);

      // Act
      const result = await controller.getRelayEmails(currentUser);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        relayAddress: mockRelayEmailList[0].relayEmail,
        primaryEmail: mockRelayEmailList[0].primaryEmail,
        description: mockRelayEmailList[0].description,
        isActive: mockRelayEmailList[0].isActive,
        forwardCount: mockRelayEmailList[0].forwardCount,
        lastForwardedAt: mockRelayEmailList[0].lastForwardedAt,
        createdAt: mockRelayEmailList[0].createdAt,
        pausedAt: mockRelayEmailList[0].pausedAt,
      });
      expect(relayEmailsService.findByUserId).toHaveBeenCalledWith(currentUser.userId);
    });

    it('should return "Not forwarded yet." when lastForwardedAt is null', async () => {
      // Arrange
      relayEmailsService.findByUserId.mockResolvedValue([mockRelayEmailList[1]]);

      // Act
      const result = await controller.getRelayEmails(currentUser);

      // Assert
      expect(result[0].lastForwardedAt).toBe('Not forwarded yet.');
    });

    it('should return empty array when user has no relay emails', async () => {
      // Arrange
      relayEmailsService.findByUserId.mockResolvedValue([]);

      // Act
      const result = await controller.getRelayEmails(currentUser);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('POST /relay-emails/create', () => {
    /**
     * Creates a new relay email address with a randomly generated username.
     * FREE tier users are limited to 3 relay emails.
     * Requires authentication.
     * Returns the newly created relay email details.
     */

    it('should create a new relay email and return its details', async () => {
      // Arrange
      relayEmailsService.createRelayEmailForUser.mockResolvedValue(mockRelayEmail);

      // Act
      const result = await controller.createRelayEmail(currentUser);

      // Assert
      expect(result).toEqual({
        relayAddress: mockRelayEmail.relayEmail,
        primaryEmail: mockRelayEmail.primaryEmail,
        description: mockRelayEmail.description,
        isActive: mockRelayEmail.isActive,
        createdAt: mockRelayEmail.createdAt,
      });
      expect(relayEmailsService.createRelayEmailForUser).toHaveBeenCalledWith(
        currentUser.userId,
        currentUser.username,
      );
    });

    it('should throw BadRequestException when FREE tier user exceeds relay email limit (3)', async () => {
      // Arrange
      relayEmailsService.createRelayEmailForUser.mockRejectedValue(
        new BadRequestException('FREE tier users can only create up to 3 relay emails'),
      );

      // Act & Assert
      await expect(controller.createRelayEmail(currentUser)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createRelayEmail(currentUser)).rejects.toThrow(
        'FREE tier users can only create up to 3 relay emails',
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      relayEmailsService.createRelayEmailForUser.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      // Act & Assert
      await expect(controller.createRelayEmail(currentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('POST /relay-emails/custom', () => {
    /**
     * Creates a relay email with a custom username (e.g., "support@domain.com").
     * This feature is only available to ADMIN users.
     * Requires authentication with admin privileges.
     * Returns the newly created relay email details.
     */

    it('should create a custom relay email for admin user', async () => {
      // Arrange
      const customRelayEmail = {
        ...mockRelayEmail,
        relayEmail: 'support@private-mailhub.com',
      };
      relayEmailsService.generateCustomRelayEmailAddress.mockResolvedValue(customRelayEmail);

      // Act
      const result = await controller.createCustomRelayEmail(adminUser, {
        customUsername: 'support',
      });

      // Assert
      expect(result).toEqual({
        relayAddress: customRelayEmail.relayEmail,
        primaryEmail: customRelayEmail.primaryEmail,
        description: customRelayEmail.description,
        isActive: customRelayEmail.isActive,
        createdAt: customRelayEmail.createdAt,
      });
      expect(relayEmailsService.generateCustomRelayEmailAddress).toHaveBeenCalledWith(
        adminUser.userId,
        'support',
      );
    });

    it('should throw ForbiddenException when non-admin user attempts to create custom relay email', async () => {
      // Arrange
      relayEmailsService.generateCustomRelayEmailAddress.mockRejectedValue(
        new ForbiddenException('Permission denied.'),
      );

      // Act & Assert
      await expect(
        controller.createCustomRelayEmail(currentUser, { customUsername: 'support' }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.createCustomRelayEmail(currentUser, { customUsername: 'support' }),
      ).rejects.toThrow('Permission denied.');
    });

    it('should throw ConflictException when custom username already exists', async () => {
      // Arrange
      relayEmailsService.generateCustomRelayEmailAddress.mockRejectedValue(
        new ConflictException('Duplicated email address'),
      );

      // Act & Assert
      await expect(
        controller.createCustomRelayEmail(adminUser, { customUsername: 'existing' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        controller.createCustomRelayEmail(adminUser, { customUsername: 'existing' }),
      ).rejects.toThrow('Duplicated email address');
    });
  });

  describe('PATCH /relay-emails/:id/description', () => {
    /**
     * Updates the description/label of a relay email.
     * Useful for organizing relay emails (e.g., "Shopping", "Social Media", "Newsletter").
     * Maximum length is 20 characters.
     * Requires authentication.
     */

    it('should update relay email description and return updated data', async () => {
      // Arrange
      const updatedRelayEmail = {
        ...mockRelayEmail,
        description: 'New Label',
      };
      relayEmailsService.updateDescription.mockResolvedValue(updatedRelayEmail);

      // Act
      const result = await controller.updateDescription(
        currentUser,
        '100',
        { description: 'New Label' },
      );

      // Assert
      expect(result).toEqual({
        id: updatedRelayEmail.id.toString(),
        description: 'New Label',
      });
      expect(relayEmailsService.updateDescription).toHaveBeenCalledWith(
        BigInt(100),
        'New Label',
      );
    });

    it('should throw NotFoundException when relay email does not exist', async () => {
      // Arrange
      relayEmailsService.updateDescription.mockRejectedValue(
        new NotFoundException('Relay email not found'),
      );

      // Act & Assert
      await expect(
        controller.updateDescription(currentUser, '999', { description: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.updateDescription(currentUser, '999', { description: 'Test' }),
      ).rejects.toThrow('Relay email not found');
    });

    it('should handle empty description (clear label)', async () => {
      // Arrange
      const updatedRelayEmail = {
        ...mockRelayEmail,
        description: '',
      };
      relayEmailsService.updateDescription.mockResolvedValue(updatedRelayEmail);

      // Act
      const result = await controller.updateDescription(
        currentUser,
        '100',
        { description: '' },
      );

      // Assert
      expect(result.description).toBe('');
    });
  });

  describe('PATCH /relay-emails/:id/active', () => {
    /**
     * Activates or deactivates a relay email.
     * When deactivated (isActive: false), incoming emails to this address will not be forwarded.
     * Useful for temporarily pausing a relay email without deleting it.
     * Requires authentication.
     */

    it('should activate relay email and return updated status', async () => {
      // Arrange
      const activatedRelayEmail = {
        ...mockRelayEmail,
        isActive: true,
      };
      relayEmailsService.updateActiveStatus.mockResolvedValue(activatedRelayEmail);

      // Act
      const result = await controller.updateActiveStatus(
        currentUser,
        '100',
        { isActive: true },
      );

      // Assert
      expect(result).toEqual({
        id: activatedRelayEmail.id.toString(),
        isActive: true,
      });
      expect(relayEmailsService.updateActiveStatus).toHaveBeenCalledWith(
        BigInt(100),
        true,
      );
    });

    it('should deactivate relay email and return updated status', async () => {
      // Arrange
      const deactivatedRelayEmail = {
        ...mockRelayEmail,
        isActive: false,
      };
      relayEmailsService.updateActiveStatus.mockResolvedValue(deactivatedRelayEmail);

      // Act
      const result = await controller.updateActiveStatus(
        currentUser,
        '100',
        { isActive: false },
      );

      // Assert
      expect(result).toEqual({
        id: deactivatedRelayEmail.id.toString(),
        isActive: false,
      });
      expect(relayEmailsService.updateActiveStatus).toHaveBeenCalledWith(
        BigInt(100),
        false,
      );
    });

    it('should throw NotFoundException when relay email does not exist', async () => {
      // Arrange
      relayEmailsService.updateActiveStatus.mockRejectedValue(
        new NotFoundException('Relay email not found'),
      );

      // Act & Assert
      await expect(
        controller.updateActiveStatus(currentUser, '999', { isActive: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /relay-emails/find-primary-email', () => {
    /**
     * Finds the primary email address associated with a relay email.
     * Verifies that the authenticated user owns the relay email.
     * Useful for looking up which primary email a relay address forwards to.
     * Requires authentication.
     */

    it('should return primary email when user owns the relay email', async () => {
      // Arrange
      const cachedData = {
        userId: currentUser.userId,
        primaryEmail: 'test@example.com',
        relayEmail: 'abc123@private-mailhub.com',
      };
      relayEmailsService.findPrimaryEmailWithOwnershipCheck.mockResolvedValue(cachedData);

      // Act
      const result = await controller.findPrimaryEmail(currentUser, {
        relayEmail: 'abc123@private-mailhub.com',
      });

      // Assert
      expect(result).toEqual({ primaryEmail: 'test@example.com' });
      expect(relayEmailsService.findPrimaryEmailWithOwnershipCheck).toHaveBeenCalledWith(
        'abc123@private-mailhub.com',
        currentUser.userId,
      );
    });

    it('should throw ForbiddenException when user does not own the relay email', async () => {
      // Arrange
      relayEmailsService.findPrimaryEmailWithOwnershipCheck.mockRejectedValue(
        new ForbiddenException('You do not have permission to access this relay email'),
      );

      // Act & Assert
      await expect(
        controller.findPrimaryEmail(currentUser, {
          relayEmail: 'other-user-relay@private-mailhub.com',
        }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.findPrimaryEmail(currentUser, {
          relayEmail: 'other-user-relay@private-mailhub.com',
        }),
      ).rejects.toThrow('You do not have permission to access this relay email');
    });

    it('should throw NotFoundException when relay email does not exist', async () => {
      // Arrange
      relayEmailsService.findPrimaryEmailWithOwnershipCheck.mockRejectedValue(
        new NotFoundException('Relay email not found'),
      );

      // Act & Assert
      await expect(
        controller.findPrimaryEmail(currentUser, {
          relayEmail: 'nonexistent@private-mailhub.com',
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.findPrimaryEmail(currentUser, {
          relayEmail: 'nonexistent@private-mailhub.com',
        }),
      ).rejects.toThrow('Relay email not found');
    });
  });
});
