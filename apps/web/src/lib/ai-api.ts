/** Typed fetch helpers for the AI context (Phase 7). */
import type {
  AiInsightDto,
  AiPreferenceDto,
  AiSearchRequest,
  AiSearchResultDto,
  AiUsageSummaryDto,
  CompletenessReportDto,
  GenerateInsightRequest,
  UpdateAiPreferenceRequest,
} from "@dlv/shared-types";

import { tokenStore } from "./token-store";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`AI API ${String(res.status)} on ${path}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const aiApi = {
  getPreferences: () => req<AiPreferenceDto>("/ai/preferences"),
  updatePreferences: (body: UpdateAiPreferenceRequest) =>
    req<AiPreferenceDto>("/ai/preferences", { method: "PUT", body: JSON.stringify(body) }),
  generateInsight: (documentId: string, body: GenerateInsightRequest = {}) =>
    req<AiInsightDto>(`/ai/documents/${documentId}/insight`, { method: "POST", body: JSON.stringify(body) }),
  latestInsight: (documentId: string) => req<AiInsightDto>(`/ai/documents/${documentId}/insight`),
  recommendations: () => req<CompletenessReportDto>("/ai/recommendations"),
  search: (body: AiSearchRequest) =>
    req<AiSearchResultDto>("/ai/search", { method: "POST", body: JSON.stringify(body) }),
  usage: () => req<AiUsageSummaryDto>("/ai/usage"),
};
