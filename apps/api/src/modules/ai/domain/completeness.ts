import { DocumentType } from '@dlv/shared-types';

/**
 * Estate completeness rules (Phase 7): pure, deterministic recommendations of
 * the "you have a will but no medical directive" kind. No AI call is involved —
 * these are domain rules over which canonical document types are present.
 */
export interface Recommendation {
  type: DocumentType;
  title: string;
  reason: string;
}

export interface CompletenessReport {
  presentTypes: DocumentType[];
  /** 0..100: proportion of essential estate documents present. */
  score: number;
  recommendations: Recommendation[];
}

interface EssentialRule {
  type: DocumentType;
  title: string;
  /** Base reason when the document is missing. */
  reason: string;
  /** Sharper reason when a related document IS present (contextual nudge). */
  linked?: { ifPresent: DocumentType; reason: string };
}

const ESSENTIALS: readonly EssentialRule[] = [
  {
    type: DocumentType.LAST_WILL,
    title: 'Last will and testament',
    reason: 'A will is the cornerstone of an estate plan. Remember: it must be executed in wet ink under the SA Wills Act.',
  },
  {
    type: DocumentType.MEDICAL_DIRECTIVE,
    title: 'Medical directive',
    reason: 'A medical directive tells doctors and family your treatment wishes if you cannot speak for yourself.',
    linked: {
      ifPresent: DocumentType.LAST_WILL,
      reason: 'You have a will but no medical directive — a directive covers decisions made while you are alive.',
    },
  },
  {
    type: DocumentType.POWER_OF_ATTORNEY,
    title: 'Power of attorney',
    reason: 'A power of attorney lets someone you trust manage your affairs if you become unable to.',
  },
  {
    type: DocumentType.LIVING_WILL,
    title: 'Living will',
    reason: 'A living will records your end-of-life care wishes ahead of time.',
    linked: {
      ifPresent: DocumentType.MEDICAL_DIRECTIVE,
      reason: 'You have a medical directive — a living will completes your end-of-life care wishes.',
    },
  },
  {
    type: DocumentType.INSURANCE,
    title: 'Insurance policies',
    reason: 'Life and household policies are among the first documents an executor needs.',
  },
  {
    type: DocumentType.FUNERAL_INSTRUCTIONS,
    title: 'Funeral instructions',
    reason: 'Clear funeral wishes spare your family difficult guesswork at the hardest time.',
  },
  {
    type: DocumentType.EMERGENCY_CONTACTS,
    title: 'Emergency contacts',
    reason: 'An up-to-date contact list helps responders and family act quickly in an emergency.',
  },
  {
    type: DocumentType.IDENTITY_DOCUMENT,
    title: 'Identity document',
    reason: 'A certified ID copy is required for almost every estate and insurance process.',
  },
];

/** Computes the completeness report from the set of present document types. */
export function computeCompleteness(present: readonly DocumentType[]): CompletenessReport {
  const presentSet = new Set(present);
  const recommendations: Recommendation[] = [];

  for (const rule of ESSENTIALS) {
    if (presentSet.has(rule.type)) continue;
    const reason =
      rule.linked && presentSet.has(rule.linked.ifPresent) ? rule.linked.reason : rule.reason;
    recommendations.push({ type: rule.type, title: rule.title, reason });
  }

  const have = ESSENTIALS.length - recommendations.length;
  const score = Math.round((have / ESSENTIALS.length) * 100);
  return { presentTypes: [...presentSet].sort(), score, recommendations };
}
