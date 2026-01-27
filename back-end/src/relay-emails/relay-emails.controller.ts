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
} from '@nestjs/common';
import { RelayEmailsService } from './relay-emails.service';
import { CreateCustomRelayDto } from './dto/create-custom-relay.dto';
import { FindPrimaryEmailDto } from './dto/find-primary.dto';
import { UpdateDescriptionDto } from './dto/update-description.dto';
import { UpdateActiveStatusDto } from './dto/update-active-status.dto';
// common
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('relay-emails')
export class RelayEmailsController {
  constructor(private relayEmailsService: RelayEmailsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getRelayEmails(
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const relayEmails = await this.relayEmailsService.findByUserId(user.userId);
    return relayEmails.map((entity) => ({
      relayAddress: entity.relayEmail,
      primaryEmail: entity.primaryEmail,
      description: entity?.description || null,
      isActive: entity.isActive,
      forwardCount: entity.forwardCount,
      lastForwardedAt: entity?.lastForwardedAt || 'Not forwarded yet.',
      createdAt: entity.createdAt,
      pausedAt: entity?.pausedAt || null,
    }));
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createRelayEmail(
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const relayEmail = await this.relayEmailsService.createRelayEmailForUser(
      user.userId,
      user.username,
    );

    return {
      relayAddress: relayEmail.relayEmail,
      primaryEmail: relayEmail.primaryEmail,
      description: relayEmail.description,
      isActive: relayEmail.isActive,
      createdAt: relayEmail.createdAt,
    };
  }

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  async createCustomRelayEmail(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCustomRelayDto,
  ) {
    const relayEmail = await this.relayEmailsService.generateCustomRelayEmailAddress(
      user.userId,
      dto.customUsername,
    );

    return {
      relayAddress: relayEmail.relayEmail,
      primaryEmail: relayEmail.primaryEmail,
      description: relayEmail.description,
      isActive: relayEmail.isActive,
      createdAt: relayEmail.createdAt,
    };
  }

  @Patch(':id/description')
  @HttpCode(HttpStatus.OK)
  async updateDescription(
    @CurrentUser() user: CurrentUserPayload,
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
    @CurrentUser() user: CurrentUserPayload,
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
    @CurrentUser() user: CurrentUserPayload,
    @Query() dto: FindPrimaryEmailDto,
  ) {
    const cached = await this.relayEmailsService.findPrimaryEmailWithOwnershipCheck(
      dto.relayEmail,
      user.userId,
    );
    return { primaryEmail: cached.primaryEmail };
  }
}
