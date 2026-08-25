/** Queue names + job payload/result contracts shared by producers (api) and workers. */
export const QUEUE_NAMES = {
  uploadScan: 'upload-scan',
  auditExport: 'audit-export',
  notification: 'notification',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** upload-scan: quarantine object awaiting ClamAV + magic-byte validation (§7.5). */
export interface UploadScanJob {
  documentId: string;
  quarantineKey: string;
  declaredMimeType: string;
  /** base64 of the object bytes (dev/local); prod streams from S3 by key. */
  contentBase64?: string;
}

export interface UploadScanResult {
  documentId: string;
  sha256: string;
  clean: boolean;
  mimeValid: boolean;
  promoted: boolean;
}

/** audit-export: append hash-chained audit events to the Object-Locked S3 export. */
export interface AuditExportJob {
  fromSequence: number;
  toSequence: number;
}

/** notification: fan out an email/SMS/WhatsApp/push message. */
export interface NotificationJob {
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  to: string;
  template: string;
  data: Record<string, unknown>;
}
