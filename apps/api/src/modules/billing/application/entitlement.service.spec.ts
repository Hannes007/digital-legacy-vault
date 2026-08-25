import { PlanTier, SubscriptionStatus } from '@dlv/shared-types';
import { ForbiddenException } from '@nestjs/common';

import { EntitlementService } from './entitlement.service';

import type { SubscriptionRecord, SubscriptionRepository, UsageRepository, UsageSnapshot } from './ports';
import type { Clock } from '../../../common/time/clock';

const clock: Clock = { now: () => new Date('2026-07-16T10:00:00Z') };

function subsRepo(sub: SubscriptionRecord | null): SubscriptionRepository {
  return {
    findByUser: async () => sub,
    findByStripeCustomerId: async () => sub,
    upsert: async (i) => ({ ...(sub as SubscriptionRecord), ...i, createdAt: new Date(), updatedAt: new Date() }),
  };
}
function usageRepo(snap: Partial<UsageSnapshot>): UsageRepository {
  const full: UsageSnapshot = { documents: 0, storageBytes: 0, vaults: 0, activeSecureLinks: 0, signaturesThisMonth: 0, ...snap };
  return { snapshot: async () => full, findUserEmail: async () => 'a@example.com' };
}
function sub(tier: PlanTier, status = SubscriptionStatus.ACTIVE): SubscriptionRecord {
  return {
    id: 's1', userId: 'u1', tier, status, interval: 'MONTH' as never, currency: 'ZAR' as never, seats: 1,
    stripeCustomerId: 'cus_1', stripeSubscriptionId: null, currentPeriodEnd: null, cancelAtPeriodEnd: false,
    graceUntil: null, createdAt: new Date(), updatedAt: new Date(),
  };
}

describe('EntitlementService', () => {
  it('defaults to FREE (not read-only) with no subscription', async () => {
    const svc = new EntitlementService(subsRepo(null), usageRepo({}), clock);
    const dto = await svc.resolveDto('u1');
    expect(dto.tier).toBe(PlanTier.FREE);
    expect(dto.readOnly).toBe(false);
  });

  it('blocks signatures on FREE (limit 0)', async () => {
    const svc = new EntitlementService(subsRepo(null), usageRepo({}), clock);
    await expect(svc.assertCanCreateSignature('u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows signatures on PREMIUM under the monthly cap and blocks at the cap', async () => {
    const under = new EntitlementService(subsRepo(sub(PlanTier.PREMIUM)), usageRepo({ signaturesThisMonth: 4 }), clock);
    await expect(under.assertCanCreateSignature('u1')).resolves.toBeUndefined();
    const at = new EntitlementService(subsRepo(sub(PlanTier.PREMIUM)), usageRepo({ signaturesThisMonth: 5 }), clock);
    await expect(at.assertCanCreateSignature('u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('treats a GRACE subscription as read-only (dunning) and blocks writes', async () => {
    const svc = new EntitlementService(subsRepo(sub(PlanTier.PREMIUM, SubscriptionStatus.GRACE)), usageRepo({}), clock);
    expect((await svc.resolveDto('u1')).readOnly).toBe(true);
    await expect(svc.assertCanCreateSignature('u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('enforces FREE document count and storage ceilings', async () => {
    const tooMany = new EntitlementService(subsRepo(null), usageRepo({ documents: 25 }), clock);
    await expect(tooMany.assertCanAddDocument('u1', 10)).rejects.toBeInstanceOf(ForbiddenException);
    const tooBig = new EntitlementService(subsRepo(null), usageRepo({ documents: 1, storageBytes: 500 * 1024 * 1024 }), clock);
    await expect(tooBig.assertCanAddDocument('u1', 1)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('downgrades a CANCELED subscription to FREE', async () => {
    const svc = new EntitlementService(subsRepo(sub(PlanTier.PREMIUM, SubscriptionStatus.CANCELED)), usageRepo({}), clock);
    expect((await svc.resolveDto('u1')).tier).toBe(PlanTier.FREE);
  });
});

describe('EntitlementService — AI gating (Phase 7)', () => {
  it('blocks a NEW AI document at the FREE cap of 10 but allows re-runs', async () => {
    const svc = new EntitlementService(subsRepo(null), usageRepo({}), clock);
    await expect(
      svc.assertCanUseAiDoc('u1', { docsThisMonth: 10, isNewDocument: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      svc.assertCanUseAiDoc('u1', { docsThisMonth: 10, isNewDocument: false }),
    ).resolves.toBeUndefined();
    await expect(
      svc.assertCanUseAiDoc('u1', { docsThisMonth: 9, isNewDocument: true }),
    ).resolves.toBeUndefined();
  });

  it('is unlimited on PREMIUM and blocked in dunning read-only', async () => {
    const premium = new EntitlementService(subsRepo(sub(PlanTier.PREMIUM)), usageRepo({}), clock);
    await expect(
      premium.assertCanUseAiDoc('u1', { docsThisMonth: 999, isNewDocument: true }),
    ).resolves.toBeUndefined();
    const grace = new EntitlementService(subsRepo(sub(PlanTier.PREMIUM, SubscriptionStatus.GRACE)), usageRepo({}), clock);
    await expect(
      grace.assertCanUseAiDoc('u1', { docsThisMonth: 0, isNewDocument: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
