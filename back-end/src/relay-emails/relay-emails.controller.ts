import {
  Controller,
  Post,
  Get,
  Patch,
  Query,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RelayEmailsService } from './relay-emails.service';
import { CreateCustomRelayDto } from './dto/create-custom-relay.dto';
import { FindPrimaryEmailDto } from './dto/find-primary.dto';
import { UpdateDescriptionDto } from './dto/update-description.dto';
import { UpdateActiveStatusDto } from './dto/update-active-status.dto';
// user
import { User } from 'src/users/entities/user.entity';
import { UsersService } from '../users/users.service';
// common
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SubscriptionTier } from '../common/enums/subscription-tier.enum';

@Controller('relay-emails')
export class RelayEmailsController {
  private readonly logger = new Logger(RelayEmailsController.name);
  constructor(
    private relayEmailsService: RelayEmailsService,
    private usersService: UsersService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getRelayEmails(
    @CurrentUser() user: { userId: bigint; username: string },
  ) {
    const relayEmailEntities = await this.relayEmailsService.findByUserId(user.userId);

    return relayEmailEntities.map((entity) => ({
      relayAddress: entity.relayEmail,
      primaryEmail: entity.primaryEmail,
      description: entity?.description || null,
      isActive: entity.isActive,
      forwardCount: entity.forwardCount,
      lastForwardedAt: entity?.lastForwardedAt || "Not forwarded yet.",
      createdAt: entity.createdAt,
      pausedAt: entity?.pausedAt || null,
    }));
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createRelayEmail(
    @CurrentUser() user: { userId: bigint; username: string },
  ) {
    // Check subscription tier and limit
    const userEntity = await this.usersService.findById(user.userId);
    if (!userEntity) {
      throw new NotFoundException('User not found');
    }

    if (userEntity.subscriptionTier === SubscriptionTier.FREE) {
      const count = await this.relayEmailsService.countByUser(user.userId);
      if (count >= 3) {
        throw new BadRequestException(
          'FREE tier users can only create up to 3 relay emails',
        );
      }
    }

    const relayEmailEntity =
      await this.relayEmailsService.generateRelayEmailAddress(
        user.userId,
        user.username,
      );

    return {
      relayAddress: relayEmailEntity.relayEmail,
      primaryEmail: relayEmailEntity.primaryEmail,
      description: relayEmailEntity.description,
      isActive: relayEmailEntity.isActive,
      createdAt: relayEmailEntity.createdAt,
    };
  }

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  async createCustomRelayEmail(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCustomRelayDto,
  ) {
    const { customUsername } = dto;
    const relayEmailEntity = await this.relayEmailsService.generateCustomRelayEmailAddress(user.userId, customUsername);

    return {
      relayAddress: relayEmailEntity.relayEmail,
      primaryEmail: relayEmailEntity.primaryEmail,
      description: relayEmailEntity.description,
      isActive: relayEmailEntity.isActive,
      createdAt: relayEmailEntity.createdAt,
    };
  }

  @Patch(':id/description')
  @HttpCode(HttpStatus.OK)
  async updateDescription(
    @CurrentUser() user: { userId: bigint; username: string },
    @Param('id') id: string,
    @Body() dto: UpdateDescriptionDto,
  ) {
    const relayEmail = await this.relayEmailsService.updateDescription(
      BigInt(id),
      dto.description,
    );

    return {
      id: relayEmail.id.toString(),
      description: relayEmail.description,
    };
  }

  @Patch(':id/active')
  @HttpCode(HttpStatus.OK)
  async updateActiveStatus(
    @CurrentUser() user: { userId: bigint; username: string },
    @Param('id') id: string,
    @Body() dto: UpdateActiveStatusDto,
  ) {
    const relayEmail = await this.relayEmailsService.updateActiveStatus(
      BigInt(id),
      dto.isActive,
    );

    return {
      id: relayEmail.id.toString(),
      isActive: relayEmail.isActive,
    };
  }

  @Get('find-primary-email')
  @HttpCode(HttpStatus.OK)
  async findPrimaryEmail(
    @CurrentUser() user: { userId: bigint; username: string },
    @Query() dto: FindPrimaryEmailDto,
  ) {
    const cached =
      await this.relayEmailsService.findPrimaryEmailByRelayEmail(dto.relayEmail);

    if (!cached) {
      throw new NotFoundException('Relay email not found');
    }

    // Verify ownership
    if (cached.userId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to access this relay email',
      );
    }

    return { primaryEmail: cached.primaryEmail };
  }
}
