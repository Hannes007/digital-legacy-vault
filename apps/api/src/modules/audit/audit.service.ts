import { sha256Hex } from '@dlv/crypto';
import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { canonicalJson } from '../../common/canonical-json';
import { CLOCK } from '../../common/tokens';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

import type { Clock } from '../../common/time/clock';

/** Genesis previous-hash for the very first event (64 zeroes). */
const GENESIS_HASH = '0'.repeat(64);

/**
 * Capability the audit append needs inside a transaction: the `audit_events`
 * delegate plus raw execution for the advisory lock. Declaring exactly what we
 * use keeps the callback strongly typed without depending on Prisma's internal
 * `TransactionClient` alias.
 */
type AuditTx = Pick<PrismaService, 'auditEvent' | '$executeRaw'>;

/**
 * Advisory-lock key that serialises audit appends. A single arbitrary constant
 * is fine: it only needs to be stable across processes.
 */
const AUDIT_LOCK_KEY = 4_820_193n;

/** Input for a single audit append. */
export interface AuditEventInput {
  /** Acting user, if any (null for anonymous/system events). */
  actorUserId?: string | null;
  /** Dotted event type, e.g. `auth.login.succeeded`. */
  eventType: string;
  /** Affected resource identifier, e.g. `user:<id>` or `session:<id>`. */
  resource: string;
  /** Masked source IP, if available. */
  ipMasked?: string | null;
  /** Structured, PII-light event payload. */
  payload: Record<string, unknown>;
}

/**
 * Append-only, hash-chained audit log (PROJECT_MEMORY §7.4).
 *
 * Every security-relevant action records one row. Each event stores the SHA-256
 * of the previous event and its own `sha256Hex(prevHash + canonicalJson(event))`,
 * so any insertion, deletion or edit breaks the chain and is detectable.
 *
 * Appends run inside a transaction guarded by a Postgres advisory lock so
 * concurrent writers cannot race on "the previous event", which would fork the
 * chain.
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async record(input: AuditEventInput): Promise<void> {
    const occurredAt = this.clock.now();
    const id = uuidv7();
    const actorUserId = input.actorUserId ?? null;
    const ipMasked = input.ipMasked ?? null;

    await this.prisma.$transaction(async (tx: AuditTx) => {
      // Serialise chain appends across all connections/processes.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_LOCK_KEY})`;

      const previous = await tx.auditEvent.findFirst({
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        select: { eventHash: true },
      });
      const prevHash = previous?.eventHash ?? GENESIS_HASH;

      const canonical = canonicalJson({
        id,
        occurredAt: occurredAt.toISOString(),
        actorUserId,
        eventType: input.eventType,
        resource: input.resource,
        ipMasked,
        payload: input.payload,
        prevHash,
      });
      const eventHash = sha256Hex(prevHash + canonical);

      await tx.auditEvent.create({
        data: {
          id,
          occurredAt,
          actorUserId,
          eventType: input.eventType,
          resource: input.resource,
          ipMasked,
          payload: input.payload as object,
          prevHash,
          eventHash,
        },
      });
    });
  }
}
