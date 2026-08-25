import { PlanTier } from '@dlv/shared-types';
import { ForbiddenException } from '@nestjs/common';

import { AiUsageService } from './ai-usage.service';

import type { AiInsightRepository, AiUsageRepository, RecordUsageInput } from './ports';
import type { Clock } from '../../../common/time/clock';
import type { EntitlementService } from '../../billing/application/entitlement.service';
import type { Env } from '@dlv/config';

const clock: Clock = { now: () => new Date('2026-07-19T10:00:00Z') };
const env = { AI_DAILY_REQUEST_CAP: 3 } as Env;

function harness(requestsToday: number) {
  const recorded: Array<RecordUsageInput & { id: string }> = [];
  const usageRepo: AiUsageRepository = {
    record: async (input) => { recorded.push(input); },
    countRequestsSince: async () => requestsToday,
    sumCostMicroUsdSince: async () => 1234,
  };
  const insightRepo: AiInsightRepository = {
    create: async () => { throw new Error('unused'); },
    latestForDocument: async () => null,
    countDistinctDocumentsSince: async () => 2,
    hasInsightForDocumentSince: async () => false,
  };
  const entitlements = {
    resolve: async () => ({ entitlements: { tier: PlanTier.FREE, aiDocsPerMonth: 10 }, readOnly: false }),
  } as unknown as EntitlementService;
  const svc = new AiUsageService(usageRepo, insightRepo, env, clock, entitlements);
  return { svc, recorded };
}

describe('AiUsageService (Phase 7 budget instrumentation)', () => {
  it('allows requests under the daily cap and blocks at the cap', async () => {
    await expect(harness(2).svc.assertWithinDailyCap('u1')).resolves.toBeUndefined();
    await expect(harness(3).svc.assertWithinDailyCap('u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('records telemetry rows with generated ids', async () => {
    const h = harness(0);
    await h.svc.record({ userId: 'u1', feature: 'SEARCH' as never, documentId: null, model: 'dev-heuristic', inputTokens: 1, outputTokens: 1, costMicroUsd: 0 });
    expect(h.recorded).toHaveLength(1);
    expect(h.recorded[0]?.id).toBeTruthy();
  });

  it('summarises usage, cost and plan limits', async () => {
    const summary = await harness(1).svc.summary('u1');
    expect(summary).toStrictEqual({
      requestsToday: 1,
      dailyCap: 3,
      docsThisMonth: 2,
      docsPerMonthLimit: 10,
      estCostMicroUsdThisMonth: 1234,
    });
  });
});
