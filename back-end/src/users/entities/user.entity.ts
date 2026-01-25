import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { SubscriptionTier } from '../../common/enums/subscription-tier.enum';
import { UserStaus } from '../../common/enums/user-status.enum';
import { RelayEmail } from '../../relay-emails/entities/relay-email.entity';
import { UserRole } from '../../common/enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: bigint;

  @Column({ type: 'varchar', length: 255 })
  username: string;

  @Column({
    type: 'char',
    length: 64,
    unique: true,
    name: 'username_hash'
  })
  usernameHash: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: UserRole,
    default: UserRole.USER,
    name: 'role',
  })
  role: UserRole;

  @Column({
    type: 'varchar',
    length: 50,
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
    name: 'subscription_tier',
  })
  subscriptionTier: SubscriptionTier;

  @Column({
    type: 'varchar',
    length: 50,
    enum: UserStaus,
    default: UserStaus.ACTIVE,
  })
  status: UserStaus;

  @Column({ 
    name: 'deactivated_at', 
    type: 'datetime', 
    nullable: true 
  })
  deactivatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ 
    name: 'deleted_at', 
    type: 'datetime', 
    nullable: true 
  })
  deletedAt: Date | null;

  @Column({ 
    name: 'last_logined_at', 
    type: 'datetime', 
    nullable: true 
  })
  lastLoginedAt: Date | null;

  @OneToMany(() => RelayEmail, (relayEmail) => relayEmail.user)
  relayEmails: RelayEmail[];
}
