import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { AuditExportProcessor } from './processors/audit-export.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { UploadScanProcessor } from './processors/upload-scan.processor';
import { QUEUE_NAMES } from './queues';
import { createRedisConnection } from './redis';

/**
 * Workers composition root. One BullMQ connection (Redis/ElastiCache), the
 * consumed queues, and a small HTTP surface for k8s health probes.
 */
@Module({
  imports: [
    BullModule.forRoot({ connection: createRedisConnection() }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.uploadScan },
      { name: QUEUE_NAMES.auditExport },
      { name: QUEUE_NAMES.notification },
    ),
  ],
  controllers: [HealthController],
  providers: [UploadScanProcessor, AuditExportProcessor, NotificationProcessor],
})
export class AppModule {}
