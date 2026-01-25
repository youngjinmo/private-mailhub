import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('relay_emails')
export class RelayEmail {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: bigint;

  @Column({ 
    type: 'bigint', 
    name: 'user_id', 
    nullable: false 
  })
  @Index('idx_user_id')
  userId: bigint;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    name: 'primary_email', 
    nullable: false 
  })
  primaryEmail: string;

  @Column({ 
    type: 'varchar', 
    length: 128, 
    name: 'relay_email', 
    nullable: false 
  })
  @Index('idx_relay_email')
  relayEmail: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: true 
  })
  description: string;

  @Column({ 
    type: 'tinyint', 
    width: 1, 
    default: 1, 
    name: 'is_active', 
    nullable: false 
  })
  isActive: boolean;

  @Column({ 
    type: 'bigint', 
    default: 0, 
    name: 'forward_count', 
    nullable: false 
  })
  forwardCount: bigint;

  @Column({
    type: 'datetime',
    nullable: true,
    name: 'last_forwarded_at',
  })
  lastForwardedAt: Date | null;

  @CreateDateColumn({ 
    name: 'created_at', 
    type: 'datetime'
  })
  createdAt: Date;

  @UpdateDateColumn({ 
    name: 'updated_at', 
    type: 'datetime' 
  })
  updatedAt: Date;

  @DeleteDateColumn({ 
    name: 'pausedAt', 
    type: 'datetime', 
    nullable: true 
  })
  pausedAt: Date | null;

  @ManyToOne(() => User, (user) => user.relayEmails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
