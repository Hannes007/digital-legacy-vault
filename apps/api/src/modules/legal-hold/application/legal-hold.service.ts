import { LegalHoldScope, LegalHoldStatus, Role, type LegalHoldDto } from '@dlv/shared-types';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';

import { toLegalHoldDto } from './legal-hold.mapper';
import {
  LEGAL_HOLD_REPOSITORY,
  type LegalHoldRecord,
  type LegalHoldRepository,
} from './ports';

import type { Clock } from '../../../common/time/clock';

/** Platform roles allowed to place or release legal holds. */
const HOLD_ADMIN_ROLES: readonly Role[] = [Role.SYSTEM_ADMIN, Role.SUPER_ADMIN];
/** Roles allowed to read the hold register (admins + read-only auditors). */
const HOLD_READ_ROLES: readonly Role[] = [Role.SYSTEM_ADMIN, Role.SUPER_ADMIN, Role.AUDITOR];

/**
 * Legal-hold context (Phase 5). A hold freezes deletion / retention overrides
 * for its scope while ACTIVE. Placement and release are restricted to platform
 * compliance roles and fully audited; the erasure path in the data-subject
 * context consults {@link resolveActiveHolds} before erasing anything.
 */
@Injectable()
export class LegalHoldService {
  constructor(
    @Inject(LEGAL_HOLD_REPOSITORY) private readonly holds: LegalHoldRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async place(
    actor: { userId: string; roles: Role[] },
    input: { scopeType: LegalHoldScope; scopeId: string; reason: string; reference?: string },
  ): Promise<LegalHoldDto> {
    this.assertRole(actor.roles, HOLD_ADMIN_ROLES);
    if (input.reason.trim().length === 0) {
      throw new BadRequestException('A reason is required to place a legal hold.');
    }
    const rec = await this.holds.create({
      id: uuidv7(),
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      reason: input.reason,
      reference: input.reference ?? null,
      placedByUserId: actor.userId,
      placedAt: this.clock.now(),
    });
    await this.audit.record({
      actorUserId: actor.userId,
      eventType: 'legal_hold.placed',
      resource: `${rec.scopeType.toLowerCase()}:${rec.scopeId}`,
      payload: { holdId: rec.id, reason: rec.reason, reference: rec.reference },
    });
    return toLegalHoldDto(rec);
  }

  async release(actor: { userId: string; roles: Role[] }, id: string): Promise<LegalHoldDto> {
    this.assertRole(actor.roles, HOLD_ADMIN_ROLES);
    const rec = await this.holds.findById(id);
    if (!rec) throw new NotFoundException('Legal hold not found.');
    if (rec.status === LegalHoldStatus.RELEASED) {
      throw new BadRequestException('This legal hold has already been released.');
    }
    const now = this.clock.now();
    await this.holds.release(id, actor.userId, now);
    await this.audit.record({
      actorUserId: actor.userId,
      eventType: 'legal_hold.released',
      resource: `${rec.scopeType.toLowerCase()}:${rec.scopeId}`,
      payload: { holdId: rec.id },
    });
    return toLegalHoldDto({ ...rec, status: LegalHoldStatus.RELEASED, releasedByUserId: actor.userId, releasedAt: now });
  }

  async list(actor: { roles: Role[] }, status?: LegalHoldStatus): Promise<LegalHoldDto[]> {
    this.assertRole(actor.roles, HOLD_READ_ROLES);
    const recs = await this.holds.list(status === undefined ? {} : { status });
    return recs.map(toLegalHoldDto);
  }

  /**
   * Active holds affecting a subject: a USER-scoped hold on them, or a
   * DOCUMENT/VAULT-scoped hold on any of their documents/vaults. Used by the
   * erasure path — no role check (internal enforcement, not an HTTP surface).
   */
  async resolveActiveHolds(subject: {
    userId: string;
    documentIds: string[];
    vaultIds: string[];
  }): Promise<LegalHoldRecord[]> {
    const scopes = [
      { scopeType: LegalHoldScope.USER, scopeId: subject.userId },
      ...subject.documentIds.map((id) => ({ scopeType: LegalHoldScope.DOCUMENT, scopeId: id })),
      ...subject.vaultIds.map((id) => ({ scopeType: LegalHoldScope.VAULT, scopeId: id })),
    ];
    return this.holds.findActiveByScopes(scopes);
  }

  private assertRole(roles: Role[], allowed: readonly Role[]): void {
    if (!roles.some((r) => allowed.includes(r))) {
      throw new ForbiddenException('You do not have permission to manage legal holds.');
    }
  }
}
