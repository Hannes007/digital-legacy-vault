/** Typed fetch helpers for the admin back-office (Phase 6). */
import type { AuditSearchResultDto, UserSupportSummaryDto } from "@dlv/shared-types";

import { tokenStore } from "./token-store";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

async function req<T>(path: string): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`Admin API ${String(res.status)} on ${path}`);
  return (await res.json()) as T;
}

export const adminApi = {
  searchAudit: (params: Record<string, string>) =>
    req<AuditSearchResultDto>(`/admin/audit?${new URLSearchParams(params).toString()}`),
  userSummary: (id: string) => req<UserSupportSummaryDto>(`/admin/users/${id}`),
};
