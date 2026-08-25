import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_NAMES, type AuditExportJob } from '../queues';

/**
 * Exports a range of hash-chained audit events to the Object-Locked S3 export
 * (invariant §7.4). Stubbed to log the range; the production job reads the rows,
 * verifies the chain, and writes an immutable, compliance-mode object.
 */
@Processor(QUEUE_NAMES.auditExport)
export class AuditExportProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditExportProcessor.name);

  process(job: Job<AuditExportJob>): Promise<{ exported: number }> {
    const { fromSequence, toSequence } = job.data;
    const exported = Math.max(0, toSequence - fromSequence + 1);
    this.logger.log(`exporting audit events ${fromSequence}..${toSequence} (${exported})`);
    return Promise.resolve({ exported });
  }
}
