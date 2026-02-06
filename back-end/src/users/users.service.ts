import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { SubscriptionTier } from '../common/enums/subscription-tier.enum';
import { ProtectionUtil } from 'src/common/utils/protection.util';
import { UserStatus } from './user.enums';
import { CacheService } from '../cache/cache.service';
import { SendMailService } from '../aws/ses/send-mail.service';
import { CustomEnvService } from '../config/custom-env.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private proectionUtil: ProtectionUtil,
    private cacheService: CacheService,
    private sendMailService: SendMailService,
    private customEnvService: CustomEnvService,
  ) {}

  async findById(id: bigint): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
    });
  }

  async findByUsernameHash(usernameHash: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { usernameHash },
    });
  }

  async existsByUsername(usernameHash: string): Promise<boolean> {
    const user = await this.findByUsernameHash(usernameHash);
    return !!user;
  }

  async createEmailUser(encryptedUsername: string): Promise<User> {
    try {
      // Check if user already exists
      const username = this.proectionUtil.decrypt(encryptedUsername);
      const usernameHash = this.proectionUtil.hash(username);
      const existingUser = await this.findByUsernameHash(usernameHash);
      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      // create account
      const user = this.userRepository.create({
        username: encryptedUsername,
        usernameHash,
      });

      return await this.userRepository.save(user);
    } catch (err) {
      this.logger.error(err, 'Failed to create user');
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async updateUser(
    usernameHash: string,
    properties: Partial<User>,
  ): Promise<void> {
    const user = await this.findByUsernameHash(usernameHash);
    if (!user) {
      throw new NotFoundException('User not found');
    } else {
      Object.assign(user, properties);
      await this.userRepository.save(user);
    }
  }

  async deactivateUser(userId: bigint): Promise<void> {
    await this.userRepository
      .update(
        { id: userId },
        {
          status: UserStatus.DEACTIVATED,
        },
      )
      .then(() => {
        this.logger.log('success to deactivated');
      })
      .catch((err) => {
        this.logger.error(err, `failed to deactivate user, userId=${userId}`);
      });
  }

  async deleteUser(userId: bigint): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete (TypeORM will handle this automatically)
    await this.userRepository.softRemove(user);
  }

  async updateSubscriptionTier(
    userId: bigint,
    tier: SubscriptionTier,
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.subscriptionTier = tier;
    return await this.userRepository.save(user);
  }

  async getUserInfo(userId: bigint): Promise<{
    username: string;
    subscriptionTier: SubscriptionTier;
    createdAt: Date;
  }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      username: this.proectionUtil.decrypt(user.username),
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt,
    };
  }

  async requestUsernameChange(
    userId: bigint,
    encryptedNewUsername: string,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newUsername = this.proectionUtil.decrypt(encryptedNewUsername);
    const newUsernameHash = this.proectionUtil.hash(newUsername);

    // Check if new username is same as current
    if (newUsernameHash === user.usernameHash) {
      throw new BadRequestException('New email is same as current email');
    }

    // Check if new username already exists
    const existingUser = await this.findByUsernameHash(newUsernameHash);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in cache
    await this.cacheService.setUsernameChangeData(
      userId,
      encryptedNewUsername,
      code,
    );

    // Send verification code to new email
    await this.sendMailService.sendVerificationCodeForReturningUser(
      newUsername,
      code,
    );
  }

  async verifyUsernameChange(userId: bigint, code: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get cached data
    const cachedData = await this.cacheService.getUsernameChangeData(userId);
    if (!cachedData) {
      throw new BadRequestException(
        'Verification code not found or expired. Please request a new code.',
      );
    }

    // Verify code
    if (cachedData.code !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    const newUsername = this.proectionUtil.decrypt(
      cachedData.encryptedNewUsername,
    );
    const newUsernameHash = this.proectionUtil.hash(newUsername);

    // Double check new username doesn't exist
    const existingUser = await this.findByUsernameHash(newUsernameHash);
    if (existingUser) {
      await this.cacheService.deleteUsernameChangeData(userId);
      throw new ConflictException('Email already in use');
    }

    // Update username
    user.username = cachedData.encryptedNewUsername;
    user.usernameHash = newUsernameHash;
    await this.userRepository.save(user);

    // Clear cache
    await this.cacheService.deleteUsernameChangeData(userId);
  }
}
