/** Typed fetch helpers for the Billing context (Phase 6). */
import type {
  BillingRedirectDto,
  CreateCheckoutRequest,
  EntitlementsDto,
  PlanDto,
  SubscriptionDto,
  UsageDto,
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
  if (!res.ok) throw new Error(`Billing API ${String(res.status)} on ${path}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const billingApi = {
  listPlans: () => req<PlanDto[]>("/billing/plans"),
  getSubscription: () => req<SubscriptionDto>("/billing/subscription"),
  getEntitlements: () => req<{ entitlements: EntitlementsDto; usage: UsageDto }>("/billing/entitlements"),
  checkout: (body: CreateCheckoutRequest) =>
    req<BillingRedirectDto>("/billing/checkout", { method: "POST", body: JSON.stringify(body) }),
  portal: () => req<BillingRedirectDto>("/billing/portal", { method: "POST" }),
  cancel: () => req<SubscriptionDto>("/billing/cancel", { method: "POST" }),
};
