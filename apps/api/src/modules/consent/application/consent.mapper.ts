import type { ConsentRecord } from './ports';
import type { ConsentDto } from '@dlv/shared-types';

/** Maps a consent record to its API DTO (no PII beyond the statement). */
export function toConsentDto(c: ConsentRecord): ConsentDto {
  return {
    id: c.id,
    purpose: c.purpose,
    status: c.status,
    statementText: c.statementText,
    statementVersion: c.statementVersion,
    sourceContext: c.sourceContext,
    grantedAt: c.grantedAt.toISOString(),
    withdrawnAt: c.withdrawnAt ? c.withdrawnAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  };
}
