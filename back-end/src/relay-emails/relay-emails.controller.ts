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
import { UsersService } from '../users/users.service';
import { CreateRelayDto } from './dto/create-relay.dto';
import { FindPrimaryEmailDto } from './dto/find-primary.dto';
import { UpdateDescriptionDto } from './dto/update-description.dto';
import { UpdateActiveStatusDto } from './dto/update-active-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
    const relayEmails = await this.relayEmailsService.findByUser(user.userId);

    return relayEmails.map((relayEmail) => ({
      id: relayEmail.id.toString(),
      relayAddress: relayEmail.relayAddress,
      primaryEmail: relayEmail.primaryEmail,
      description: relayEmail.description,
      isActive: relayEmail.isActive,
      forwardCount: relayEmail.forwardCount.toString(),
      lastForwardedAt: relayEmail.lastForwardedAt,
      createdAt: relayEmail.createdAt,
    }));
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createRelayEmail(
    @CurrentUser() user: { userId: bigint; username: string },
    @Body() dto: CreateRelayDto,
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

    const relayEmail =
      await this.relayEmailsService.generateRelayEmailAddress(
        user.userId,
        dto.primaryEmail,
      );

    return {
      id: relayEmail.id.toString(),
      relayAddress: relayEmail.relayAddress,
      primaryEmail: relayEmail.primaryEmail,
      description: relayEmail.description,
      isActive: relayEmail.isActive,
      createdAt: relayEmail.createdAt,
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
      user.userId,
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
      user.userId,
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
    const relayEmail =
      await this.relayEmailsService.findRelayEmailWithUserId(dto.relayEmail);

    if (!relayEmail) {
      throw new NotFoundException('Relay email not found');
    }

    // Verify ownership
    if (relayEmail.userId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to access this relay email',
      );
    }

    return { primaryEmail: relayEmail.primaryEmail };
  }
}
