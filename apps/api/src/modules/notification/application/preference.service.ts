import { NotificationCategory, type NotificationPreferenceDto, type UpdatePreferenceRequest } from '@dlv/shared-types';
import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { applyLock, defaultPrefs, type ChannelPrefs } from '../domain/categories';

import { toPreferenceDto } from './notification.mapper';
import { PREFERENCE_REPOSITORY, type PreferenceRecord, type PreferenceRepository } from './ports';

/** Per-category channel preferences with the non-disableable rule enforced. */
@Injectable()
export class PreferenceService {
  constructor(@Inject(PREFERENCE_REPOSITORY) private readonly prefs: PreferenceRepository) {}

  async list(userId: string): Promise<NotificationPreferenceDto[]> {
    const stored = await this.prefs.listByUser(userId);
    const byCat = new Map(stored.map((p) => [p.category, p]));
    return Object.values(NotificationCategory).map((category) => {
      const rec = byCat.get(category);
      const base: ChannelPrefs = rec ?? defaultPrefs(category);
      const locked = applyLock(category, base);
      return toPreferenceDto({ userId, category, ...locked });
    });
  }

  async resolve(userId: string, category: NotificationCategory): Promise<ChannelPrefs> {
    const stored = await this.prefs.listByUser(userId);
    const rec = stored.find((p) => p.category === category);
    return applyLock(category, rec ?? defaultPrefs(category));
  }

  async update(userId: string, req: UpdatePreferenceRequest): Promise<NotificationPreferenceDto> {
    const current = await this.resolve(userId, req.category);
    const merged: ChannelPrefs = applyLock(req.category, {
      email: req.email ?? current.email,
      sms: req.sms ?? current.sms,
      whatsapp: req.whatsapp ?? current.whatsapp,
      push: req.push ?? current.push,
    });
    const saved: PreferenceRecord = { userId, category: req.category, ...merged };
    await this.prefs.upsert({ id: uuidv7(), ...saved });
    return toPreferenceDto(saved);
  }
}
