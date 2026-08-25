import { PlanTier, SubscriptionStatus, type EntitlementsDto } from '@dlv/shared-types';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { CLOCK } from '../../../common/tokens';
import { entitlementsFor, type Entitlements } from '../domain/entitlements';

import { entitlementsDto } from './billing.mapper';
import {
  SUBSCRIPTION_REPOSITORY,
  USAGE_REPOSITORY,
  type SubscriptionRepository,
  type UsageRepository,
} from './ports';

import type { Clock } from '../../../common/time/clock';

/** Effective entitlements + whether the account is currently read-only (dunning). */
export interface ResolvedEntitlements {
  entitlements: Entitlements;
  readOnly: boolean;
}

/**
 * Resolves and enforces freemium entitlements (Phase 6). No subscription ⇒ FREE.
 * PAST_DUE / GRACE ⇒ the tier's entitlements but read-only (14-day dunning grace,
 * §9 — never delete for non-payment). CANCELED / INCOMPLETE ⇒ downgrade to FREE.
 */
@Injectable()
export class EntitlementService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(USAGE_REPOSITORY) private readonly usage: UsageRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async resolve(userId: string): Promise<ResolvedEntitlements> {
    const sub = await this.subscriptions.findByUser(userId);
    if (!sub) return { entitlements: entitlementsFor(PlanTier.FREE), readOnly: false };

    if (sub.status === SubscriptionStatus.CANCELED || sub.status === SubscriptionStatus.INCOMPLETE) {
      return { entitlements: entitlementsFor(PlanTier.FREE), readOnly: false };
    }
    const readOnly = sub.status === SubscriptionStatus.GRACE || sub.status === SubscriptionStatus.PAST_DUE;
    return { entitlements: entitlementsFor(sub.tier), readOnly };
  }

  async resolveDto(userId: string): Promise<EntitlementsDto> {
    const { entitlements, readOnly } = await this.resolve(userId);
    return entitlementsDto(entitlements, readOnly);
  }

  /** Blocks writes while the account is in a dunning read-only state. */
  private assertWritable(readOnly: boolean): void {
    if (readOnly) {
      throw new ForbiddenException('Your subscription payment is overdue. Update billing to make changes again.');
    }
  }

  private monthStart(): Date {
    const now = this.clock.now();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  async assertCanCreateSignature(userId: string): Promise<void> {
    const { entitlements, readOnly } = await this.resolve(userId);
    this.assertWritable(readOnly);
    const limit = entitlements.signaturesPerMonth;
    if (limit === null) return;
    const { signaturesThisMonth } = await this.usage.snapshot(userId, this.monthStart());
    if (signaturesThisMonth >= limit) {
      throw new ForbiddenException(
        limit === 0
          ? 'Signature ceremonies require a paid plan. Upgrade to sign documents.'
          : `You have reached your plan limit of ${String(limit)} signatures this month.`,
      );
    }
  }

  async assertCanAddDocument(userId: string, addBytes: number): Promise<void> {
    const { entitlements, readOnly } = await this.resolve(userId);
    this.assertWritable(readOnly);
    const snap = await this.usage.snapshot(userId, this.monthStart());
    if (entitlements.maxDocuments !== null && snap.documents >= entitlements.maxDocuments) {
      throw new ForbiddenException(
        `Your plan allows ${String(entitlements.maxDocuments)} documents. Upgrade for more.`,
      );
    }
    if (snap.storageBytes + addBytes > entitlements.storageBytes) {
      throw new ForbiddenException('This upload would exceed your plan storage. Upgrade for more space.');
    }
  }

  /**
   * Gates AI document processing (Phase 7). `aiDocsPerMonth` counts distinct
   * documents with AI insights this month; re-running AI on an already-counted
   * document is free, so `isNewDocument` distinguishes the two. The AI context
   * supplies both counters (it owns the `ai_insights` read model).
   */
  async assertCanUseAiDoc(
    userId: string,
    usage: { docsThisMonth: number; isNewDocument: boolean },
  ): Promise<void> {
    const { entitlements, readOnly } = await this.resolve(userId);
    this.assertWritable(readOnly);
    const limit = entitlements.aiDocsPerMonth;
    if (limit === null || !usage.isNewDocument) return;
    if (usage.docsThisMonth >= limit) {
      throw new ForbiddenException(
        limit === 0
          ? 'AI document insights require a paid plan. Upgrade to use AI features.'
          : `You have reached your plan limit of ${String(limit)} AI-processed documents this month.`,
      );
    }
  }
}
