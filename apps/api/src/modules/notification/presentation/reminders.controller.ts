import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { ReminderService } from '../application/reminder.service';

import { CreateReminderDto } from './dto/notification.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';
import type { ReminderDto } from '@dlv/shared-types';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly reminders: ReminderService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ReminderDto[]> {
    return this.reminders.list(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReminderDto): Promise<ReminderDto> {
    return this.reminders.create(user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.reminders.cancel(user.userId, id);
  }
}
