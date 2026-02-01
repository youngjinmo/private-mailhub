import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { SubscriptionTier } from '../common/enums/subscription-tier.enum';
import { ProtectionUtil } from 'src/common/utils/protection.util';
import { UserStatus } from './user.enums';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private proectionUtil: ProtectionUtil,
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
    const user = this.findByUsernameHash(usernameHash);
    return !!user;
  }

  async createEmailUser(encryptedUsername: string): Promise<User> {
    try {
      // Check if user already exists
      const username = this.proectionUtil.decrypt(encryptedUsername); 
      const usernameHash= this.proectionUtil.hash(username);
      const existingUser = await this.findByUsernameHash(usernameHash);
      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      // create account
      const user = this.userRepository.create({ 
        username: encryptedUsername, 
        usernameHash 
      });

      return await this.userRepository.save(user);
    } catch(err) {
      this.logger.error(err, 'Failed to create user');
      throw new InternalServerErrorException("Failed to create user");
    }
  }

  async updateUser(usernameHash: string, properties: Partial<User>): Promise<void> {
    const user = await this.findByUsernameHash(usernameHash);
    if (!user) {
      throw new NotFoundException('User not found');
    } else {
      Object.assign(user, properties);
      await this.userRepository.save(user);
    }
  }

  async deactivateUser(userId: bigint): Promise<void> {
    await this.userRepository.update({ id: userId },{
      status: UserStatus.DEACTIVATED
    }).then((res) => {
      this.logger.log('success to deactivated');
    }).catch((err) => {
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
}
