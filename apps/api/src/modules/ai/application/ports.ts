import type { ServerProcessableText } from '../domain/server-processable';
import type { AiFeature, DocumentStatus, DocumentType, VaultKind } from '@dlv/shared-types';

export const AI_GATEWAY = Symbol('AI_GATEWAY');
export const AI_TEXT_SOURCE = Symbol('AI_TEXT_SOURCE');
export const AI_INSIGHT_REPOSITORY = Symbol('AI_INSIGHT_REPOSITORY');
export const AI_USAGE_REPOSITORY = Symbol('AI_USAGE_REPOSITORY');
export const AI_PREFERENCE_REPOSITORY = Symbol('AI_PREFERENCE_REPOSITORY');
export const AI_SEARCH_PORT = Symbol('AI_SEARCH_PORT');

// --- AiGateway (PROJECT_MEMORY §2.8: provider abstraction over Claude) -------
export interface GatewayUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
}
export interface ClassificationResult extends GatewayUsage {
  type: DocumentType;
  confidence: number;
}
export interface SummaryResult extends GatewayUsage {
  summary: string;
}
export interface KeywordResult extends GatewayUsage {
  keywords: string[];
}
/**
 * Provider abstraction over the Anthropic Claude API. Only accepts
 * `ServerProcessableText` — the compiler rejects unproven strings
 * (coding-standards §10.8). Query text for search is user-typed input,
 * never vault content, so it is a plain string.
 */
export interface AiGateway {
  classify(text: ServerProcessableText): Promise<ClassificationResult>;
  summarise(text: ServerProcessableText, title: string): Promise<SummaryResult>;
  extractKeywords(query: string): Promise<KeywordResult>;
}

// --- Document text source (cross-cutting read model, like billing usage) -----
export interface DocumentTextRecord {
  documentId: string;
  ownerId: string;
  title: string;
  type: string;
  status: DocumentStatus;
  vaultKind: VaultKind;
  /** OCR text of the current version; null when OCR has not produced text. */
  text: string | null;
}
export interface AiTextSource {
  getDocumentText(documentId: string): Promise<DocumentTextRecord | null>;
  /** Distinct document types owned by the user — STANDARD vaults only. */
  listOwnerDocumentTypes(ownerId: string): Promise<string[]>;
  /** Auto-categorisation: writes the suggested type onto the document. */
  applySuggestedType(documentId: string, type: DocumentType): Promise<void>;
}

// --- Persistence -------------------------------------------------------------
export interface AiInsightRecord {
  id: string;
  documentId: string;
  ownerId: string;
  suggestedType: string;
  confidence: number;
  summary: string;
  model: string;
  appliedAt: Date | null;
  createdAt: Date;
}
export interface CreateInsightInput {
  id: string;
  documentId: string;
  ownerId: string;
  suggestedType: string;
  confidence: number;
  summary: string;
  model: string;
  appliedAt: Date | null;
}
export interface AiInsightRepository {
  create(input: CreateInsightInput): Promise<AiInsightRecord>;
  latestForDocument(documentId: string): Promise<AiInsightRecord | null>;
  /** Distinct documents with insights this month (entitlement gating). */
  countDistinctDocumentsSince(ownerId: string, since: Date): Promise<number>;
  hasInsightForDocumentSince(documentId: string, since: Date): Promise<boolean>;
}

export interface RecordUsageInput {
  userId: string;
  feature: AiFeature;
  documentId: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
}
export interface AiUsageRepository {
  record(input: RecordUsageInput & { id: string }): Promise<void>;
  countRequestsSince(userId: string, since: Date): Promise<number>;
  sumCostMicroUsdSince(userId: string, since: Date): Promise<number>;
}

export interface AiPreferenceRecord {
  aiEnabled: boolean;
  updatedAt: Date;
}
export interface AiPreferenceRepository {
  find(userId: string): Promise<AiPreferenceRecord | null>;
  upsert(userId: string, aiEnabled: boolean): Promise<AiPreferenceRecord>;
}

// --- Search (STANDARD-vault-only FTS) -----------------------------------------
export interface AiSearchHit {
  documentId: string;
  title: string;
  type: string;
  rank: number;
  snippet: string | null;
}
/**
 * FTS over the caller's documents, restricted at the SQL level to STANDARD
 * vaults so client-encrypted objects can never surface through AI search.
 */
export interface AiSearchPort {
  search(ownerId: string, query: string, limit: number): Promise<AiSearchHit[]>;
}
