import type { LegalHoldRecord } from './ports';
import type { LegalHoldDto } from '@dlv/shared-types';

export function toLegalHoldDto(h: LegalHoldRecord): LegalHoldDto {
  return {
    id: h.id,
    scopeType: h.scopeType,
    scopeId: h.scopeId,
    reason: h.reason,
    reference: h.reference,
    status: h.status,
    placedByUserId: h.placedByUserId,
    placedAt: h.placedAt.toISOString(),
    releasedByUserId: h.releasedByUserId,
    releasedAt: h.releasedAt ? h.releasedAt.toISOString() : null,
    createdAt: h.createdAt.toISOString(),
  };
}
