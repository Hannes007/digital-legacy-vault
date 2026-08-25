import type { AiFeature } from '../common/ai-enums.js';
import type { DocumentType } from '../common/document-type.js';

/** Per-user AI preference (disclosure + opt-out, roadmap Phase 7). */
export interface AiPreferenceDto {
  /** False ⇒ every AI feature is disabled for this user. */
  aiEnabled: boolean;
  /** Null until the user has explicitly saved a preference. */
  updatedAt: string | null;
}
export interface UpdateAiPreferenceRequest {
  aiEnabled: boolean;
}

/** A stored classification + summary insight for one document. */
export interface AiInsightDto {
  id: string;
  documentId: string;
  suggestedType: DocumentType;
  /** 0..1 classifier confidence. */
  confidence: number;
  summary: string;
  /** Model that produced the insight (`dev-heuristic` in offline dev). */
  model: string;
  /** True once the suggested type has been applied to the document. */
  applied: boolean;
  createdAt: string;
}
export interface GenerateInsightRequest {
  /** Apply the suggested type to the document (auto-categorisation). */
  apply?: boolean;
}

/** One completeness recommendation ("you have a will but no medical directive"). */
export interface AiRecommendationDto {
  type: DocumentType;
  title: string;
  reason: string;
}
export interface CompletenessReportDto {
  presentTypes: DocumentType[];
  /** 0..100 — how many essential estate documents are present. */
  score: number;
  recommendations: AiRecommendationDto[];
}

/** Natural-language search over server-processable documents only. */
export interface AiSearchRequest {
  query: string;
  limit?: number;
}
export interface AiSearchHitDto {
  documentId: string;
  title: string;
  type: string;
  rank: number;
  snippet: string | null;
}
export interface AiSearchResultDto {
  interpretedQuery: string;
  keywords: string[];
  hits: AiSearchHitDto[];
}

/** Per-user AI usage + instrumented cost budget snapshot. */
export interface AiUsageSummaryDto {
  requestsToday: number;
  dailyCap: number;
  docsThisMonth: number;
  /** Null = unlimited on the current plan. */
  docsPerMonthLimit: number | null;
  estCostMicroUsdThisMonth: number;
}

/** Feature re-export marker so the enum and DTOs travel together. */
export type { AiFeature };
