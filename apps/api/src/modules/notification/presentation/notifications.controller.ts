import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { NotificationService } from '../application/notification.service';
import { PreferenceService } from '../application/preference.service';

import { UpdatePreferenceDto } from './dto/notification.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';
import type { NotificationDto, NotificationPreferenceDto } from '@dlv/shared-types';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly preferences: PreferenceService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<NotificationDto[]> {
    return this.notifications.list(user.userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async read(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.notifications.markRead(user.userId, id);
  }

  @Get('preferences')
  listPreferences(@CurrentUser() user: AuthUser): Promise<NotificationPreferenceDto[]> {
    return this.preferences.list(user.userId);
  }

  @Put('preferences')
  updatePreference(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePreferenceDto,
  ): Promise<NotificationPreferenceDto> {
    return this.preferences.update(user.userId, dto);
  }
}
