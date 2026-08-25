import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { PushService } from '../application/push.service';

import { PushSubscriptionDto, UnsubscribePushDto } from './dto/notification.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

@Controller('push/subscriptions')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: PushSubscriptionDto): Promise<{ subscribed: true }> {
    return this.push.subscribe(user.userId, dto);
  }

  @Post('remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: UnsubscribePushDto): Promise<void> {
    await this.push.unsubscribe(user.userId, dto.endpoint);
  }
}
