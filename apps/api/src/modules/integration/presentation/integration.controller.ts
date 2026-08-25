import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { ApiKeyService } from '../application/api-key.service';
import { WebhookService } from '../application/webhook.service';

import { CreateApiKeyDto, CreateWebhookDto } from './dto/integration.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';
import type {
  ApiKeyDto,
  CreatedApiKeyDto,
  CreatedWebhookDto,
  WebhookDeliveryDto,
  WebhookDto,
} from '@dlv/shared-types';

/** Integration self-service API (Phase 8): API keys + webhook endpoints. */
@Controller('integration')
@UseGuards(JwtAuthGuard)
export class IntegrationController {
  constructor(
    private readonly apiKeys: ApiKeyService,
    private readonly webhooks: WebhookService,
  ) {}

  @Post('api-keys')
  createApiKey(@CurrentUser() user: AuthUser, @Body() body: CreateApiKeyDto): Promise<CreatedApiKeyDto> {
    return this.apiKeys.create(user.userId, body);
  }

  @Get('api-keys')
  listApiKeys(@CurrentUser() user: AuthUser): Promise<ApiKeyDto[]> {
    return this.apiKeys.list(user.userId);
  }

  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeApiKey(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.apiKeys.revoke(user.userId, id);
  }

  @Post('webhooks')
  createWebhook(@CurrentUser() user: AuthUser, @Body() body: CreateWebhookDto): Promise<CreatedWebhookDto> {
    return this.webhooks.create(user.userId, body);
  }

  @Get('webhooks')
  listWebhooks(@CurrentUser() user: AuthUser): Promise<WebhookDto[]> {
    return this.webhooks.list(user.userId);
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableWebhook(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.webhooks.disable(user.userId, id);
  }

  @Get('webhooks/:id/deliveries')
  deliveries(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WebhookDeliveryDto[]> {
    return this.webhooks.recentDeliveries(user.userId, id);
  }
}
