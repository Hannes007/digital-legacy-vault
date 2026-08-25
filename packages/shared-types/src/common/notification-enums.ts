/** Notification categories (Phase 6). SECURITY and EMERGENCY_ACCESS are non-disableable. */
export enum NotificationCategory {
  SECURITY = 'SECURITY',
  EMERGENCY_ACCESS = 'EMERGENCY_ACCESS',
  SHARING = 'SHARING',
  SIGNATURE = 'SIGNATURE',
  BILLING = 'BILLING',
  REMINDER = 'REMINDER',
  PRODUCT = 'PRODUCT',
}

/** Delivery channels. */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  PUSH = 'PUSH',
}

/** Per-notification delivery status. */
export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

/** Reminder lifecycle. */
export enum ReminderStatus {
  SCHEDULED = 'SCHEDULED',
  FIRED = 'FIRED',
  CANCELLED = 'CANCELLED',
}
