import { type CreateReminderRequest, type ReminderDto } from '@dlv/shared-types';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';

import { toReminderDto } from './notification.mapper';
import { REMINDER_REPOSITORY, type ReminderRecord, type ReminderRepository } from './ports';

import type { Clock } from '../../../common/time/clock';

/** Proactive reminders (Phase 6). The worker polls {@link due} to fire them. */
@Injectable()
export class ReminderService {
  constructor(
    @Inject(REMINDER_REPOSITORY) private readonly reminders: ReminderRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, input: CreateReminderRequest): Promise<ReminderDto> {
    const dueAt = new Date(input.dueAt);
    if (Number.isNaN(dueAt.getTime())) throw new BadRequestException('Invalid due date.');
    if (input.cadenceDays !== undefined && input.cadenceDays <= 0) {
      throw new BadRequestException('Cadence must be a positive number of days.');
    }
    const rec = await this.reminders.create({
      id: uuidv7(),
      userId,
      title: input.title,
      body: input.body ?? null,
      dueAt,
      cadenceDays: input.cadenceDays ?? null,
    });
    await this.audit.record({
      actorUserId: userId,
      eventType: 'reminder.created',
      resource: `reminder:${rec.id}`,
      payload: { dueAt: dueAt.toISOString(), cadenceDays: rec.cadenceDays },
    });
    return toReminderDto(rec);
  }

  async list(userId: string): Promise<ReminderDto[]> {
    const recs = await this.reminders.listByUser(userId);
    return recs.map(toReminderDto);
  }

  async cancel(userId: string, id: string): Promise<void> {
    const rec = await this.loadOwned(userId, id);
    await this.reminders.cancel(rec.id);
    await this.audit.record({
      actorUserId: userId,
      eventType: 'reminder.cancelled',
      resource: `reminder:${rec.id}`,
      payload: {},
    });
  }

  /** Scheduled reminders now due (for the worker to dispatch). */
  due(): Promise<ReminderRecord[]> {
    return this.reminders.due(this.clock.now());
  }

  private async loadOwned(userId: string, id: string): Promise<ReminderRecord> {
    const rec = await this.reminders.findById(id);
    if (!rec) throw new NotFoundException('Reminder not found.');
    if (rec.userId !== userId) throw new ForbiddenException('Not your reminder.');
    return rec;
  }
}
