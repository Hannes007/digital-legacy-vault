import type { SubscriptionRecord } from './ports';
import type { PlanCatalogEntry } from '../domain/plan-catalog';
import type { Entitlements } from '../domain/entitlements';
import type { PlanDto, SubscriptionDto } from '@dlv/shared-types';

export function toPlanDto(p: PlanCatalogEntry): PlanDto {
  const { tier, ...limits } = p.entitlements;
  return {
    tier: p.tier,
    name: p.name,
    priceZarCents: p.priceZarCents,
    priceUsdCents: p.priceUsdCents,
    priceEurCents: p.priceEurCents,
    yearlyZarCents: p.yearlyZarCents,
    entitlements: { tier, ...limits },
  };
}

export function toSubscriptionDto(s: SubscriptionRecord): SubscriptionDto {
  return {
    tier: s.tier,
    status: s.status,
    interval: s.interval,
    currency: s.currency,
    seats: s.seats,
    currentPeriodEnd: s.currentPeriodEnd ? s.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    graceUntil: s.graceUntil ? s.graceUntil.toISOString() : null,
  };
}

export function entitlementsDto(e: Entitlements, readOnly: boolean) {
  return {
    tier: e.tier,
    storageBytes: e.storageBytes,
    maxDocuments: e.maxDocuments,
    maxVaults: e.maxVaults,
    activeSecureLinks: e.activeSecureLinks,
    signaturesPerMonth: e.signaturesPerMonth,
    aiDocsPerMonth: e.aiDocsPerMonth,
    familyMembers: e.familyMembers,
    readOnly,
  };
}
