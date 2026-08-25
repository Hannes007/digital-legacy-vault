/** Typed fetch helpers for organisation workspaces + integrations (Phase 8). */
import type {
  ApiKeyDto,
  ClientRelationshipDto,
  CreateApiKeyRequest,
  CreateClientRelationshipRequest,
  CreateWebhookRequest,
  CreatedApiKeyDto,
  CreatedWebhookDto,
  OrgUsageDto,
  ResidencyDto,
  RespondClientRelationshipRequest,
  SsoConnectionDto,
  UpdateResidencyRequest,
  UpsertSsoConnectionRequest,
  WebhookDeliveryDto,
  WebhookDto,
} from "@dlv/shared-types";

import { tokenStore } from "./token-store";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

/** Mirrors the API's organisation DTOs (identity context, Phase 2). */
export interface OrganisationDto {
  id: string;
  name: string;
  orgType: string;
  billingEmail: string;
  verificationStatus: string;
  createdAt: string;
  myRole: string;
}
export interface OrgMemberDto {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: string;
}

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
  if (!res.ok) throw new Error(`Org API ${String(res.status)} on ${path}`);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const orgApi = {
  // organisations (Phase 2 foundation)
  listMyOrgs: () => req<OrganisationDto[]>("/organisations"),
  listMembers: (orgId: string) => req<OrgMemberDto[]>(`/organisations/${orgId}/members`),
  invite: (orgId: string, email: string, role: string) =>
    req<OrgMemberDto>(`/organisations/${orgId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  // client relationships (Phase 8)
  requestClientAccess: (orgId: string, body: CreateClientRelationshipRequest) =>
    req<{ status: string }>(`/organisations/${orgId}/clients`, { method: "POST", body: JSON.stringify(body) }),
  listOrgClients: (orgId: string) => req<ClientRelationshipDto[]>(`/organisations/${orgId}/clients`),
  revokeOrgClient: (orgId: string, relationshipId: string) =>
    req<void>(`/organisations/${orgId}/clients/${relationshipId}`, { method: "DELETE" }),
  myProfessionalAccess: () => req<ClientRelationshipDto[]>("/me/professional-access"),
  acceptProfessionalAccess: (id: string, body: RespondClientRelationshipRequest = {}) =>
    req<void>(`/me/professional-access/${id}/accept`, { method: "POST", body: JSON.stringify(body) }),
  declineProfessionalAccess: (id: string) =>
    req<void>(`/me/professional-access/${id}/decline`, { method: "POST", body: JSON.stringify({}) }),
  revokeProfessionalAccess: (id: string) =>
    req<void>(`/me/professional-access/${id}`, { method: "DELETE" }),

  // usage + residency (Phase 8)
  usage: (orgId: string) => req<OrgUsageDto>(`/organisations/${orgId}/usage`),
  residency: (orgId: string) => req<ResidencyDto>(`/organisations/${orgId}/residency`),
  updateResidency: (orgId: string, body: UpdateResidencyRequest) =>
    req<ResidencyDto>(`/organisations/${orgId}/residency`, { method: "PUT", body: JSON.stringify(body) }),

  // SSO (Phase 8)
  getSso: (orgId: string) => req<SsoConnectionDto>(`/organisations/${orgId}/sso`),
  upsertSso: (orgId: string, body: UpsertSsoConnectionRequest) =>
    req<SsoConnectionDto>(`/organisations/${orgId}/sso`, { method: "PUT", body: JSON.stringify(body) }),

  // integrations (Phase 8)
  createApiKey: (body: CreateApiKeyRequest) =>
    req<CreatedApiKeyDto>("/integration/api-keys", { method: "POST", body: JSON.stringify(body) }),
  listApiKeys: () => req<ApiKeyDto[]>("/integration/api-keys"),
  revokeApiKey: (id: string) => req<void>(`/integration/api-keys/${id}`, { method: "DELETE" }),
  createWebhook: (body: CreateWebhookRequest) =>
    req<CreatedWebhookDto>("/integration/webhooks", { method: "POST", body: JSON.stringify(body) }),
  listWebhooks: () => req<WebhookDto[]>("/integration/webhooks"),
  disableWebhook: (id: string) => req<void>(`/integration/webhooks/${id}`, { method: "DELETE" }),
  webhookDeliveries: (id: string) => req<WebhookDeliveryDto[]>(`/integration/webhooks/${id}/deliveries`),
};
