import { DocumentType } from '@dlv/shared-types';

/**
 * Deterministic keyword classifier — the offline dev fallback behind the
 * `AiGateway` (mirrors the KMS/TSA/Stripe dev-fallback pattern) and the
 * baseline the synthetic-corpus precision gate (roadmap Phase 7 exit,
 * ≥90%) runs against. Pure and side-effect free.
 */
export interface Classification {
  type: DocumentType;
  /** 0..1 — proportional to keyword-evidence strength. */
  confidence: number;
}

/** Weighted keyword evidence per type. Phrases score higher than single words. */
const KEYWORDS: ReadonlyArray<[DocumentType, ReadonlyArray<[string, number]>]> = [
  [DocumentType.LAST_WILL, [['last will and testament', 6], ['last will', 4], ['testament', 3], ['testator', 3], ['testatrix', 3], ['bequeath', 3], ['residue of my estate', 4], ['revoke all previous wills', 4], ['executor of this will', 3]]],
  [DocumentType.LIVING_WILL, [['living will', 6], ['advance directive', 5], ['end-of-life', 3], ['life-sustaining treatment', 4], ['artificial life support', 4], ['persistent vegetative', 4]]],
  [DocumentType.POWER_OF_ATTORNEY, [['power of attorney', 6], ['attorney-in-fact', 4], ['hereby appoint', 2], ['act on my behalf', 3], ['agent to act', 3], ['special power', 2], ['general power', 2]]],
  [DocumentType.MEDICAL_DIRECTIVE, [['medical directive', 6], ['healthcare proxy', 5], ['health care proxy', 5], ['treatment preferences', 3], ['do not resuscitate', 4], ['dnr order', 4], ['medical power', 3]]],
  [DocumentType.INSURANCE, [['insurance policy', 5], ['policy number', 3], ['premium', 2], ['sum assured', 4], ['beneficiary nomination', 3], ['underwriter', 3], ['cover amount', 3], ['policyholder', 4]]],
  [DocumentType.PASSPORT, [['passport', 5], ['passport number', 5], ['nationality', 2], ['date of expiry', 2], ['place of issue', 3], ['machine readable zone', 4]]],
  [DocumentType.IDENTITY_DOCUMENT, [['identity document', 5], ['identity number', 4], ['smart id card', 5], ['id card', 3], ['identity card', 4], ['rsa identity', 4]]],
  [DocumentType.MARRIAGE_CERTIFICATE, [['marriage certificate', 6], ['civil union', 4], ['solemnised', 3], ['spouse', 2], ['marriage register', 4], ['antenuptial', 3]]],
  [DocumentType.BIRTH_CERTIFICATE, [['birth certificate', 6], ['born on', 2], ['place of birth', 3], ['registration of birth', 5], ['mother', 1], ['father', 1]]],
  [DocumentType.TRUST, [['trust deed', 6], ['trustee', 3], ['inter vivos', 4], ['testamentary trust', 5], ['trust property', 3], ['founder', 2], ['master of the high court', 3]]],
  [DocumentType.PROPERTY, [['title deed', 6], ['erf', 3], ['deeds office', 4], ['transfer of property', 4], ['mortgage bond', 4], ['sectional title', 4], ['conveyancer', 3]]],
  [DocumentType.VEHICLE_REGISTRATION, [['vehicle registration', 6], ['certificate of registration in respect of motor vehicle', 6], ['vin', 3], ['chassis number', 4], ['licence disc', 4], ['engine number', 4]]],
  [DocumentType.BUSINESS, [['shareholders agreement', 5], ['memorandum of incorporation', 5], ['company registration', 4], ['cipc', 4], ['share certificate', 4], ['directors resolution', 4]]],
  [DocumentType.EMPLOYMENT_CONTRACT, [['employment contract', 6], ['contract of employment', 6], ['employee', 2], ['employer', 2], ['remuneration', 3], ['notice period', 3], ['probation', 3]]],
  [DocumentType.FUNERAL_INSTRUCTIONS, [['funeral', 4], ['burial', 4], ['cremation', 4], ['memorial service', 4], ['funeral policy', 3], ['final wishes', 4]]],
  [DocumentType.EMERGENCY_CONTACTS, [['emergency contact', 6], ['in case of emergency', 5], ['next of kin', 4], ['contact list', 3]]],
  [DocumentType.PASSWORD_REFERENCE, [['password manager', 6], ['master password', 5], ['login credentials', 4], ['account passwords', 4], ['vault password hint', 4]]],
  [DocumentType.CRYPTO_RECOVERY, [['seed phrase', 6], ['recovery phrase', 6], ['bitcoin', 3], ['ethereum', 3], ['hardware wallet', 5], ['private key backup', 5], ['crypto wallet', 5]]],
  [DocumentType.MEDICAL_RECORD, [['medical record', 5], ['patient', 3], ['diagnosis', 4], ['prescription', 3], ['pathology', 4], ['medical history', 4], ['treatment plan', 3]]],
  [DocumentType.TAX, [['tax return', 6], ['sars', 4], ['income tax', 5], ['assessment', 2], ['irp5', 5], ['itr12', 5], ['taxable income', 4], ['vat', 2]]],
];

/** Score at which confidence saturates to ~0.95. */
const SATURATION_SCORE = 10;

/** Classifies free text into a canonical DocumentType. Falls back to OTHER. */
export function classifyText(text: string): Classification {
  const haystack = text.toLowerCase();
  let best: DocumentType = DocumentType.OTHER;
  let bestScore = 0;

  for (const [type, entries] of KEYWORDS) {
    let score = 0;
    for (const [phrase, weight] of entries) {
      if (haystack.includes(phrase)) score += weight;
    }
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }

  if (bestScore === 0) return { type: DocumentType.OTHER, confidence: 0.2 };
  const confidence = Math.min(0.95, 0.35 + (bestScore / SATURATION_SCORE) * 0.6);
  return { type: best, confidence };
}

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;
const MAX_SUMMARY_CHARS = 600;

/** Extractive fallback summary: the first few informative sentences. */
export function extractiveSummary(text: string, title: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return `No readable text was extracted from "${title}".`;
  const sentences = clean.split(SENTENCE_SPLIT).filter((s) => s.length > 20);
  const summary = (sentences.length > 0 ? sentences.slice(0, 3).join(' ') : clean).slice(0, MAX_SUMMARY_CHARS);
  return summary;
}

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'about', 'all', 'any', 'do', 'documents', 'document', 'find', 'for', 'from',
  'have', 'i', 'in', 'is', 'me', 'my', 'of', 'on', 'or', 'show', 'that', 'the', 'to', 'was', 'were',
  'what', 'when', 'where', 'which', 'with', 'you',
]);

/** Keyword extraction fallback for natural-language search queries. */
export function extractKeywordsHeuristic(query: string): string[] {
  const tokens = query.toLowerCase().match(/[a-z0-9][a-z0-9-]{1,}/g) ?? [];
  const keywords = tokens.filter((t) => !STOPWORDS.has(t));
  return [...new Set(keywords)].slice(0, 8);
}
