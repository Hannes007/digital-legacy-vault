import { NotificationCategory } from '@dlv/shared-types';

/** Channel preference flags for one category. */
export interface ChannelPrefs {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
}

/**
 * Categories the user cannot fully silence — security and emergency access must
 * always reach them by at least email (invariant 6 / §9). Preference updates for
 * these keep email forced on.
 */
export const NON_DISABLEABLE: ReadonlySet<NotificationCategory> = new Set([
  NotificationCategory.SECURITY,
  NotificationCategory.EMERGENCY_ACCESS,
]);

export function isLocked(category: NotificationCategory): boolean {
  return NON_DISABLEABLE.has(category);
}

/** Sensible default channels per category. */
export function defaultPrefs(category: NotificationCategory): ChannelPrefs {
  switch (category) {
    case NotificationCategory.SECURITY:
    case NotificationCategory.EMERGENCY_ACCESS:
      return { email: true, sms: true, whatsapp: false, push: true };
    case NotificationCategory.BILLING:
    case NotificationCategory.SIGNATURE:
    case NotificationCategory.SHARING:
    case NotificationCategory.REMINDER:
      return { email: true, sms: false, whatsapp: false, push: true };
    case NotificationCategory.PRODUCT:
      return { email: true, sms: false, whatsapp: false, push: false };
    default:
      return { email: true, sms: false, whatsapp: false, push: true };
  }
}

/** Enforces the non-disableable rule: locked categories keep email on. */
export function applyLock(category: NotificationCategory, prefs: ChannelPrefs): ChannelPrefs {
  if (isLocked(category)) return { ...prefs, email: true };
  return prefs;
}
