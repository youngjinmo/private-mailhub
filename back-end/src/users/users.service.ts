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
import { CacheService } from '../cache/cache.service';
import { SendMailService } from '../aws/ses/send-mail.service';
import { UserStaus } from '../common/enums/user-status.enum';
import { SecureUtil } from '../common/utils/secure.util';
import { CodeUtil } from '../common/utils/code.util';
import { CustomEnvService } from '../config/custom-env.service';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private cacheService: CacheService,
    private sendMailService: SendMailService,
    private customEnvService: CustomEnvService,
    private secureUtil: SecureUtil,
  ) {}

  async findById(id: bigint): Promise<User> {
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

  async findByUsernameHash(username: string): Promise<User> {
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

  async requestUsernameChange(
    userId: bigint,
    currentUsernameHash: string,
    newUsername: string,
  ): Promise<void> {
    // Check if new username is same as current
    if (this.hashUsername(newUsername) === currentUsernameHash) {
      throw new BadRequestException('New username is same as current username');
    }

    // Check if username already exists
    const exists = await this.existsByUsernameHash(newUsername);
    if (exists) {
      throw new BadRequestException('Username already exists');
    }

    const code = CodeUtil.generateVerificationCode();

    // Store the code and new username in Redis
    const ttl = this.customEnvService.getWithDefault(
      'VERIFICATION_CODE_EXPIRATION',
      300000,
    );
    await this.cacheService.set(
      this.getUsernameChangeCacheKey(userId),
      JSON.stringify({ newUsername, code }),
      ttl,
    );

    // Send verification code to new email
    await this.sendMailService.sendUsernameChangeVerificationCode(
      newUsername,
      code,
    );
  }

  async verifyUsernameChange(
    userId: bigint,
    currentEncryptedUsername: string,
    code: string,
  ): Promise<void> {
    const cacheKey = this.getUsernameChangeCacheKey(userId);

    // Get stored data from Redis
    const storedData = await this.cacheService.get<string>(cacheKey);

    if (!storedData) {
      throw new BadRequestException(
        'Verification code not found or expired. Please request a new code.',
      );
    }

    const { newUsername, code: storedCode } = JSON.parse(storedData);

    // Verify the code
    if (storedCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    // Change username
    await this.updateUsername(userId, newUsername);

    // Clean up Redis
    await this.cacheService.del(cacheKey);

    // Send notification to old email
    await this.sendMailService.sendUsernameChangedNotification(
      this.decryptUsername(currentEncryptedUsername),
      newUsername,
    );
  }

  // Private helper methods

  private encryptUsername(username: string): string {
    return this.secureUtil.encrypt(username);
  }

  private decryptUsername(encryptedUsername: string): string {
    return this.secureUtil.decrypt(encryptedUsername);
  }

  private hashUsername(username: string): string {
    return this.secureUtil.hash(username);
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

  private getUsernameChangeCacheKey(userId: bigint): string {
    return `username_change:${userId.toString()}`;
  }
}
