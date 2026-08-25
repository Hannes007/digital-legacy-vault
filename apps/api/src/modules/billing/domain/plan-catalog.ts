import { PlanTier } from '@dlv/shared-types';

import {
  ENTERPRISE_ENTITLEMENTS,
  FAMILY_ENTITLEMENTS,
  FREE_ENTITLEMENTS,
  PREMIUM_ENTITLEMENTS,
  PROFESSIONAL_ENTITLEMENTS,
  type Entitlements,
} from './entitlements';

/** A plan in the public catalogue. Prices are minor units (cents), VAT-inclusive. */
export interface PlanCatalogEntry {
  tier: PlanTier;
  name: string;
  priceZarCents: number;
  priceUsdCents: number | null;
  priceEurCents: number | null;
  yearlyZarCents: number | null;
  entitlements: Entitlements;
}

/** Public plan catalogue (PRD §pricing; ZAR primary, ~2 months free yearly). */
export const PLAN_CATALOG: readonly PlanCatalogEntry[] = [
  { tier: PlanTier.FREE, name: 'Free', priceZarCents: 0, priceUsdCents: 0, priceEurCents: 0, yearlyZarCents: 0, entitlements: FREE_ENTITLEMENTS },
  { tier: PlanTier.PREMIUM, name: 'Premium', priceZarCents: 9900, priceUsdCents: null, priceEurCents: null, yearlyZarCents: 99000, entitlements: PREMIUM_ENTITLEMENTS },
  { tier: PlanTier.FAMILY, name: 'Family', priceZarCents: 19900, priceUsdCents: null, priceEurCents: null, yearlyZarCents: 199000, entitlements: FAMILY_ENTITLEMENTS },
  { tier: PlanTier.PROFESSIONAL, name: 'Professional', priceZarCents: 49900, priceUsdCents: null, priceEurCents: null, yearlyZarCents: null, entitlements: PROFESSIONAL_ENTITLEMENTS },
  { tier: PlanTier.ENTERPRISE, name: 'Enterprise', priceZarCents: 499900, priceUsdCents: null, priceEurCents: null, yearlyZarCents: null, entitlements: ENTERPRISE_ENTITLEMENTS },
];

/** Paid tiers eligible for self-service checkout (Enterprise is sales-led). */
export function isSelfServeCheckoutTier(tier: PlanTier): boolean {
  return tier === PlanTier.PREMIUM || tier === PlanTier.FAMILY || tier === PlanTier.PROFESSIONAL;
}
