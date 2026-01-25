import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { RelayEmail } from '../relay-emails/entities/relay-email.entity';
import { SubscriptionTier } from '../common/enums/subscription-tier.enum';
import { UserStaus } from '../common/enums/user-status.enum';
import { SecureUtil } from '../common/utils/secure.util';
import { CustomEnvService } from '../config/custom-env.service';
import { UserRole } from 'src/common/enums/user-role.enum';

@Injectable()
export class UsersService {
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private secureUtil: SecureUtil,
  ) {}

  /**
   * Encrypt username using EncryptionUtil
   */
  private encryptUsername(username: string): string {
    return this.secureUtil.encrypt(username);
  }

  /**
   * Decrypt username using EncryptionUtil
   */
  private decryptUsername(encryptedUsername: string): string {
    return this.secureUtil.decrypt(encryptedUsername);
  }

  /**
   * Generate SHA-256 hash for username (for indexing and searching)
   */
  private hashUsername(username: string): string {
    return this.secureUtil.hash(username);
  }

  async findById(id: bigint): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      ...user,
      username: this.secureUtil.decrypt(user.username)
    };
  }

  async findByUsernameHash(username: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { usernameHash: this.hashUsername(username)},
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      ...user,
      username: this.decryptUsername(user.username)
    };
  }

  async existsByUsernameHash(username: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { usernameHash: this.hashUsername(username) },
    });
    return !!user;
  }

  async createEmailUser(username: string): Promise<User> {
    // Check if user already exists
    const existingUser = await this.existsByUsernameHash(username);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user = this.userRepository.create({
      username: this.encryptUsername(username),
      usernameHash: this.hashUsername(username),
      role: UserRole.USER,
      status: UserStaus.ACTIVE,
    });

    return await this.userRepository.save(user);
  }

  async deactivateUser(userId: bigint): Promise<void> {
    const user = await this.validateUser(userId);
    user.status = UserStaus.DEACTIVATED;
    user.deactivatedAt = this.getCurrentDatetime();
    await this.userRepository.save(user);
  }

  async deleteUser(userId: bigint): Promise<void> {
    const user = await this.validateUser(userId);
    user.deletedAt = this.getCurrentDatetime();
    // Soft delete (TypeORM will handle this automatically)
    await this.userRepository.softRemove(user);
  }

  async updateUserByUsernameHash(usernameHash: string, properties: Partial<Omit<User, 'username' | 'usernameHash'>>) {
    const user = await this.userRepository.findOne({
      where: { usernameHash: this.hashUsername(usernameHash) }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update only the specified properties, not including username
    await this.userRepository.update(
      { usernameHash: this.hashUsername(usernameHash) },
      properties
    );
  }

  async updateSubscriptionTier(
    userId: bigint,
    tier: SubscriptionTier,
  ): Promise<User> {
    const user = await this.validateUser(userId);
    user.subscriptionTier = tier;
    user.updatedAt = this.getCurrentDatetime();
    return await this.userRepository.save(user);
  }

  async updateUsername(userId: bigint, newUsername: string): Promise<void> {
    await this.validateUser(userId);

    // Check if new username already exists
    const existingUser = await this.findByUsernameHash(newUsername);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Username already exists');
    }
    // Check it new username is same as current username
    if (existingUser) {
      throw new BadRequestException("New usernamae is same as current username");
    }

    const encryptedUsername = this.encryptUsername(newUsername);
    const usernameHash = this.hashUsername(newUsername);

    // Use transaction to ensure atomicity
    await this.dataSource.transaction(async (manager) => {
      // Update all relay emails' primary_email and primary_email_hash
      await manager.update(
        RelayEmail,
        { userId: userId },
        {
          primaryEmail: encryptedUsername,
        },
      );

      // Update user's username and username_hash
      await manager.update(
        User,
        { id: userId },
        {
          username: encryptedUsername,
          usernameHash: usernameHash,
        }
      );
    });
  }

  async deactivateAccount(userId: bigint): Promise<void> {
    await this.validateUser(userId);

    // Use transaction to ensure atomicity
    await this.dataSource.transaction(async (manager) => {
      // Update user status to DEACTIVATED
      await manager.update(
        User, 
        { id: userId }, 
        {
          status: UserStaus.DEACTIVATED,
          deactivatedAt: this.getCurrentDatetime(),
        });

      // Deactivate all relay emails
      await manager.update(
        RelayEmail,
        { userId: userId },
        { isActive: false },
      );
    });
  }

  private async validateUser(userId: bigint): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  private getCurrentDatetime(): Date {
    return new Date();
  }
}
