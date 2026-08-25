import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { AuditService } from '../../audit/audit.service';

import { AI_PREFERENCE_REPOSITORY } from './ports';

import type { AiPreferenceRepository } from './ports';
import type { AiPreferenceDto } from '@dlv/shared-types';

/**
 * Per-user AI preference (Phase 7 disclosure + opt-out). AI features default
 * to enabled with a clear disclosure UX; a user can switch every AI feature
 * off at any time, and every other AI service consults this first.
 */
@Injectable()
export class AiPreferenceService {
  constructor(
    @Inject(AI_PREFERENCE_REPOSITORY) private readonly prefs: AiPreferenceRepository,
    private readonly audit: AuditService,
  ) {}

  async get(userId: string): Promise<AiPreferenceDto> {
    const record = await this.prefs.find(userId);
    if (!record) return { aiEnabled: true, updatedAt: null };
    return { aiEnabled: record.aiEnabled, updatedAt: record.updatedAt.toISOString() };
  }

  async update(userId: string, aiEnabled: boolean): Promise<AiPreferenceDto> {
    const record = await this.prefs.upsert(userId, aiEnabled);
    await this.audit.record({
      actorUserId: userId,
      eventType: aiEnabled ? 'ai.preference.enabled' : 'ai.preference.disabled',
      resource: `user:${userId}`,
      payload: { aiEnabled },
    });
    return { aiEnabled: record.aiEnabled, updatedAt: record.updatedAt.toISOString() };
  }

  /** Guard used by every AI feature: opt-out always wins. */
  async assertEnabled(userId: string): Promise<void> {
    const { aiEnabled } = await this.get(userId);
    if (!aiEnabled) {
      throw new ForbiddenException('AI features are switched off for your account. Re-enable them under Settings → AI.');
    }
  }
}
