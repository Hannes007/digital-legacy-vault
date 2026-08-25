import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { ClientVaultItemDto } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { ClientVaultService } from '../application/client-vault.service';
import { CreateClientVaultItemDto } from './dto/client-vault.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

/**
 * Client-Encrypted Vault (`/api/v1/client-vault`). Zero-knowledge: the API only
 * stores/returns ciphertext produced in the browser.
 */
@Controller('client-vault/items')
@UseGuards(JwtAuthGuard)
export class ClientVaultController {
  constructor(private readonly items: ClientVaultService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateClientVaultItemDto,
  ): Promise<ClientVaultItemDto> {
    return this.items.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ClientVaultItemDto[]> {
    return this.items.list(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<ClientVaultItemDto> {
    return this.items.get(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.items.delete(user.userId, id);
  }
}
