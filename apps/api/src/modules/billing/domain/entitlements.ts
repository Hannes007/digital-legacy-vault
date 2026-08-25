import { PlanTier } from '@dlv/shared-types';

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** Resolved freemium entitlements for a tier. null = unlimited (FR-BIL-001). */
export interface Entitlements {
  tier: PlanTier;
  storageBytes: number;
  maxDocuments: number | null;
  maxVaults: number | null;
  activeSecureLinks: number | null;
  signaturesPerMonth: number | null;
  aiDocsPerMonth: number | null;
  familyMembers: number;
}

export const FREE_ENTITLEMENTS: Entitlements = {
  tier: PlanTier.FREE,
  storageBytes: 500 * MB,
  maxDocuments: 25,
  maxVaults: 1,
  activeSecureLinks: 3,
  signaturesPerMonth: 0,
  aiDocsPerMonth: 10,
  familyMembers: 0,
};
export const PREMIUM_ENTITLEMENTS: Entitlements = {
  tier: PlanTier.PREMIUM,
  storageBytes: 20 * GB,
  maxDocuments: null,
  maxVaults: null,
  activeSecureLinks: null,
  signaturesPerMonth: 5,
  aiDocsPerMonth: null,
  familyMembers: 0,
};
export const FAMILY_ENTITLEMENTS: Entitlements = {
  tier: PlanTier.FAMILY,
  storageBytes: 100 * GB,
  maxDocuments: null,
  maxVaults: null,
  activeSecureLinks: null,
  signaturesPerMonth: 10,
  aiDocsPerMonth: null,
  familyMembers: 6,
};
export const PROFESSIONAL_ENTITLEMENTS: Entitlements = {
  tier: PlanTier.PROFESSIONAL,
  storageBytes: 200 * GB,
  maxDocuments: null,
  maxVaults: null,
  activeSecureLinks: null,
  signaturesPerMonth: 50,
  aiDocsPerMonth: null,
  familyMembers: 0,
};
export const ENTERPRISE_ENTITLEMENTS: Entitlements = {
  tier: PlanTier.ENTERPRISE,
  storageBytes: 5 * 1024 * GB,
  maxDocuments: null,
  maxVaults: null,
  activeSecureLinks: null,
  signaturesPerMonth: null,
  aiDocsPerMonth: null,
  familyMembers: 0,
};

/** Canonical per-tier limits (PRD §pricing; quotas are configuration-driven). */
export const ENTITLEMENTS: Record<PlanTier, Entitlements> = {
  [PlanTier.FREE]: FREE_ENTITLEMENTS,
  [PlanTier.PREMIUM]: PREMIUM_ENTITLEMENTS,
  [PlanTier.FAMILY]: FAMILY_ENTITLEMENTS,
  [PlanTier.PROFESSIONAL]: PROFESSIONAL_ENTITLEMENTS,
  [PlanTier.ENTERPRISE]: ENTERPRISE_ENTITLEMENTS,
};

/** Entitlements for a tier (never throws — unknown tiers fall back to FREE). */
export function entitlementsFor(tier: PlanTier): Entitlements {
  return ENTITLEMENTS[tier] ?? FREE_ENTITLEMENTS;
}
