import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK, ENV } from '../../../common/tokens';
import { EntitlementService } from '../../billing/application/entitlement.service';

import { AI_INSIGHT_REPOSITORY, AI_USAGE_REPOSITORY } from './ports';

import type { AiInsightRepository, AiUsageRepository, RecordUsageInput } from './ports';
import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';
import type { AiUsageSummaryDto } from '@dlv/shared-types';

/**
 * AI budget instrumentation (Phase 7 exit criterion): every AI request is
 * recorded with its estimated cost, and a per-user daily request cap acts as
 * the budget circuit breaker. Telemetry rows are written only after the
 * client-encrypted exclusion guard has passed, so `ai_usage` can never
 * reference a client-encrypted object.
 */
@Injectable()
export class AiUsageService {
  constructor(
    @Inject(AI_USAGE_REPOSITORY) private readonly usage: AiUsageRepository,
    @Inject(AI_INSIGHT_REPOSITORY) private readonly insights: AiInsightRepository,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly entitlements: EntitlementService,
  ) {}

  private dayStart(): Date {
    const now = this.clock.now();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private monthStart(): Date {
    const now = this.clock.now();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  /** Budget circuit breaker: rejects once the daily request cap is reached. */
  async assertWithinDailyCap(userId: string): Promise<void> {
    const used = await this.usage.countRequestsSince(userId, this.dayStart());
    if (used >= this.env.AI_DAILY_REQUEST_CAP) {
      throw new ForbiddenException('Daily AI request budget reached. Try again tomorrow.');
    }
  }

  /** Records one telemetry row. Call ONLY after the exclusion guard passed. */
  async record(input: RecordUsageInput): Promise<void> {
    await this.usage.record({ id: uuidv7(), ...input });
  }

  async summary(userId: string): Promise<AiUsageSummaryDto> {
    const monthStart = this.monthStart();
    const [requestsToday, costThisMonth, docsThisMonth, resolved] = await Promise.all([
      this.usage.countRequestsSince(userId, this.dayStart()),
      this.usage.sumCostMicroUsdSince(userId, monthStart),
      this.insights.countDistinctDocumentsSince(userId, monthStart),
      this.entitlements.resolve(userId),
    ]);
    return {
      requestsToday,
      dailyCap: this.env.AI_DAILY_REQUEST_CAP,
      docsThisMonth,
      docsPerMonthLimit: resolved.entitlements.aiDocsPerMonth,
      estCostMicroUsdThisMonth: costThisMonth,
    };
  }
}
