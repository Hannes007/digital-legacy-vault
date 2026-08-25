/** Typed fetch helpers for the sharing + estate contexts (Phase 4). */
import type {
  BeneficiaryDto,
  CreateBeneficiaryRequest,
  CreateExecutorRequest,
  CreateSecureLinkRequest,
  CreateShareRequest,
  DocumentShareDto,
  EmergencyAccessRequestDto,
  ExecutorDto,
  SecureLinkDto,
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
  if (!res.ok) throw new Error(`API ${String(res.status)} on ${path}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const legacyApi = {
  // Sharing
  createShare: (body: CreateShareRequest) => req<DocumentShareDto>("/shares", { method: "POST", body: JSON.stringify(body) }),
  listShares: () => req<DocumentShareDto[]>("/shares"),
  revokeShare: (id: string) => req<void>(`/shares/${id}`, { method: "DELETE" }),
  createSecureLink: (body: CreateSecureLinkRequest) => req<SecureLinkDto>("/secure-links", { method: "POST", body: JSON.stringify(body) }),

  // Estate
  listBeneficiaries: () => req<BeneficiaryDto[]>("/beneficiaries"),
  addBeneficiary: (body: CreateBeneficiaryRequest) => req<BeneficiaryDto>("/beneficiaries", { method: "POST", body: JSON.stringify(body) }),
  removeBeneficiary: (id: string) => req<void>(`/beneficiaries/${id}`, { method: "DELETE" }),
  listExecutors: () => req<ExecutorDto[]>("/executors"),
  addExecutor: (body: CreateExecutorRequest) => req<ExecutorDto>("/executors", { method: "POST", body: JSON.stringify(body) }),
  removeExecutor: (id: string) => req<void>(`/executors/${id}`, { method: "DELETE" }),
  listEmergencyRequests: () => req<EmergencyAccessRequestDto[]>("/emergency-access"),
  denyEmergency: (id: string) => req<void>(`/emergency-access/${id}/deny`, { method: "POST" }),
};
