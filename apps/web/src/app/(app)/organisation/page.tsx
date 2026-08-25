"use client";

import { Building2, Globe2, KeyRound, Link2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type {
  ApiKeyDto,
  ClientRelationshipDto,
  OrgUsageDto,
  ResidencyDto,
  SsoConnectionDto,
  WebhookDto,
} from "@dlv/shared-types";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Spinner } from "@/components/ui";
import { orgApi, type OrgMemberDto, type OrganisationDto } from "@/lib/org-api";

const ADMIN_ROLES = new Set(["COMPANY_ADMIN", "HOSPITAL_ADMIN"]);
const PROFESSIONAL_ROLES = new Set(["LAWYER", "DOCTOR", "FINANCIAL_ADVISER"]);

function gb(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusVariant(status: string): "success" | "warning" | "neutral" | "danger" {
  if (status === "ACTIVE" || status === "DELIVERED") return "success";
  if (status === "PENDING") return "warning";
  if (status === "DEAD" || status === "REVOKED" || status === "DECLINED") return "danger";
  return "neutral";
}

export default function OrganisationPage() {
  const [orgs, setOrgs] = useState<OrganisationDto[]>([]);
  const [selected, setSelected] = useState<OrganisationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // per-org data
  const [members, setMembers] = useState<OrgMemberDto[]>([]);
  const [clients, setClients] = useState<ClientRelationshipDto[]>([]);
  const [usage, setUsage] = useState<OrgUsageDto | null>(null);
  const [residency, setResidency] = useState<ResidencyDto | null>(null);
  const [sso, setSso] = useState<SsoConnectionDto | null | "none">(null);

  // personal data
  const [incoming, setIncoming] = useState<ClientRelationshipDto[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyDto[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookDto[]>([]);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  // forms
  const [clientEmail, setClientEmail] = useState("");
  const [keyName, setKeyName] = useState("");
  const [hookUrl, setHookUrl] = useState("");

  const isAdmin = selected ? ADMIN_ROLES.has(selected.myRole) : false;
  const isProfessional = selected ? PROFESSIONAL_ROLES.has(selected.myRole) : false;

  const reloadPersonal = useCallback(async () => {
    try {
      const [inc, keys, hooks] = await Promise.all([
        orgApi.myProfessionalAccess(),
        orgApi.listApiKeys(),
        orgApi.listWebhooks(),
      ]);
      setIncoming(inc);
      setApiKeys(keys);
      setWebhooks(hooks);
    } catch {
      setError("We couldn’t load your integration settings.");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const mine = await orgApi.listMyOrgs();
        setOrgs(mine);
        setSelected(mine[0] ?? null);
      } catch {
        setError("We couldn’t load your organisations.");
      }
      void reloadPersonal();
    })();
  }, [reloadPersonal]);

  const reloadOrg = useCallback(async (org: OrganisationDto) => {
    setMembers([]); setClients([]); setUsage(null); setResidency(null); setSso(null);
    try {
      setMembers(await orgApi.listMembers(org.id));
      setClients(await orgApi.listOrgClients(org.id));
    } catch { /* non-admin members may not see everything */ }
    if (ADMIN_ROLES.has(org.myRole)) {
      try {
        const [u, r] = await Promise.all([orgApi.usage(org.id), orgApi.residency(org.id)]);
        setUsage(u); setResidency(r);
      } catch { /* ignore */ }
      try {
        setSso(await orgApi.getSso(org.id));
      } catch {
        setSso("none");
      }
    }
  }, []);

  useEffect(() => {
    if (selected) void reloadOrg(selected);
  }, [selected, reloadOrg]);

  async function requestAccess() {
    if (!selected || !clientEmail.trim()) return;
    setError(null);
    try {
      await orgApi.requestClientAccess(selected.id, { clientEmail: clientEmail.trim() });
      setClientEmail("");
      setNotice("Request sent. Your client will see it under “Professional access to my vault”.");
      void reloadOrg(selected);
    } catch {
      setError("Could not send that request (it may already exist).");
    }
  }

  async function respond(rel: ClientRelationshipDto, accept: boolean) {
    setError(null);
    try {
      if (accept) await orgApi.acceptProfessionalAccess(rel.id);
      else await orgApi.declineProfessionalAccess(rel.id);
      void reloadPersonal();
    } catch {
      setError("Could not update that request.");
    }
  }

  async function createKey() {
    if (!keyName.trim()) return;
    setError(null);
    try {
      const created = await orgApi.createApiKey({ name: keyName.trim(), scopes: ["documents:read", "usage:read"] });
      setRevealedSecret(created.apiKey);
      setKeyName("");
      void reloadPersonal();
    } catch {
      setError("Could not create the API key.");
    }
  }

  async function createHook() {
    if (!hookUrl.trim()) return;
    setError(null);
    try {
      const created = await orgApi.createWebhook({ url: hookUrl.trim(), events: ["document.ready", "signature.sealed"] });
      setRevealedSecret(created.secret);
      setHookUrl("");
      void reloadPersonal();
    } catch {
      setError("Could not create the webhook (HTTPS URLs only).");
    }
  }

  async function switchRegion(region: string) {
    if (!selected) return;
    try {
      setResidency(await orgApi.updateResidency(selected.id, { dataRegion: region as ResidencyDto["dataRegion"] }));
    } catch {
      setError("Could not update data residency.");
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-h1 text-fg">Organisation</h1>
        <p className="text-body-sm text-fg-secondary">
          Workspaces for firms, hospitals and advisers — client access, SSO, integrations, usage and residency.
        </p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}
      {revealedSecret ? (
        <Alert variant="warning" title="Copy this secret now — it will not be shown again">
          <code className="break-all text-body-sm">{revealedSecret}</code>
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Professional access to my vault"
          description="Professionals who asked for, or hold, scoped read access to your documents. You stay in control."
        />
        <CardBody>
          {incoming.length === 0 ? (
            <p className="text-body-sm text-fg-secondary">No professional has requested access to your vault.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {incoming.map((rel) => (
                <li key={rel.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-body text-fg">
                      {rel.professionalName} · {rel.organisationName}
                    </span>
                    <span className="text-body-sm text-fg-secondary">
                      {rel.role.toLowerCase().replaceAll("_", " ")} · scope {rel.scope.toLowerCase().replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(rel.status)}>{rel.status}</Badge>
                    {rel.status === "PENDING" ? (
                      <>
                        <Button size="sm" onClick={() => void respond(rel, true)}>Accept</Button>
                        <Button size="sm" variant="secondary" onClick={() => void respond(rel, false)}>Decline</Button>
                      </>
                    ) : rel.status === "ACTIVE" ? (
                      <Button size="sm" variant="danger-outline" onClick={() => void orgApi.revokeProfessionalAccess(rel.id).then(reloadPersonal)}>
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {orgs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="You’re not in an organisation yet"
          description="Organisation workspaces are for law firms, hospitals and advisory practices serving their clients."
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            {orgs.map((o) => (
              <Button
                key={o.id}
                size="sm"
                variant={selected?.id === o.id ? "primary" : "secondary"}
                onClick={() => setSelected(o)}
              >
                <Building2 className="size-4" />
                {o.name}
              </Button>
            ))}
          </div>

          {selected ? (
            <>
              <Card>
                <CardHeader title="Members" description={`Your role: ${selected.myRole.toLowerCase().replaceAll("_", " ")}`} />
                <CardBody>
                  {members.length === 0 ? <Spinner /> : (
                    <ul className="flex flex-col gap-2">
                      {members.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2">
                          <span className="text-body text-fg">{m.firstName} {m.lastName} <span className="text-fg-secondary">· {m.email}</span></span>
                          <Badge variant={statusVariant(m.status)}>{m.role}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>

              {isProfessional || isAdmin ? (
                <Card>
                  <CardHeader
                    title="Client vault access"
                    description="Request scoped, consent-gated read access to a client’s vault. Nothing is shared until they accept."
                  />
                  <CardBody className="flex flex-col gap-4">
                    {isProfessional ? (
                      <div className="flex gap-2">
                        <Input
                          label="Client email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="client@example.com"
                        />
                        <Button onClick={() => void requestAccess()} disabled={!clientEmail.trim()}>
                          <UserPlus className="size-4" /> Request access
                        </Button>
                      </div>
                    ) : null}
                    {clients.length === 0 ? (
                      <p className="text-body-sm text-fg-secondary">No client relationships yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {clients.map((rel) => (
                          <li key={rel.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2">
                            <span className="text-body text-fg">
                              {rel.clientEmail} <span className="text-fg-secondary">· {rel.professionalName}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant={statusVariant(rel.status)}>{rel.status}</Badge>
                              {rel.status !== "REVOKED" && rel.status !== "DECLINED" ? (
                                <Button size="sm" variant="danger-outline" onClick={() => void orgApi.revokeOrgClient(selected.id, rel.id).then(() => reloadOrg(selected))}>
                                  Revoke
                                </Button>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
              ) : null}

              {isAdmin && usage ? (
                <Card>
                  <CardHeader title="Usage" description="Metered per organisation — this feeds org billing." />
                  <CardBody>
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div><dt className="text-body-sm text-fg-secondary">Seats (active)</dt><dd className="text-h3 text-fg">{usage.activeMembers}/{usage.seats}</dd></div>
                      <div><dt className="text-body-sm text-fg-secondary">Documents</dt><dd className="text-h3 text-fg">{usage.documents}</dd></div>
                      <div><dt className="text-body-sm text-fg-secondary">Storage</dt><dd className="text-h3 text-fg">{gb(usage.storageBytes)}</dd></div>
                      <div><dt className="text-body-sm text-fg-secondary">Signatures (month)</dt><dd className="text-h3 text-fg">{usage.signaturesThisMonth}</dd></div>
                      <div><dt className="text-body-sm text-fg-secondary">AI requests (month)</dt><dd className="text-h3 text-fg">{usage.aiRequestsThisMonth}</dd></div>
                      <div><dt className="text-body-sm text-fg-secondary">Client links</dt><dd className="text-h3 text-fg">{usage.activeClientRelationships}</dd></div>
                    </dl>
                  </CardBody>
                </Card>
              ) : null}

              {isAdmin && residency ? (
                <Card>
                  <CardHeader
                    title="Data residency"
                    description="Where this organisation’s data is kept primary. South African data stays in af-south-1 by default."
                  />
                  <CardBody className="flex items-center gap-2">
                    <Globe2 className="size-5 text-accent" aria-hidden />
                    {residency.availableRegions.map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={residency.dataRegion === r ? "primary" : "secondary"}
                        onClick={() => void switchRegion(r)}
                      >
                        {r}
                      </Button>
                    ))}
                  </CardBody>
                </Card>
              ) : null}

              {isAdmin ? (
                <Card>
                  <CardHeader
                    title="Enterprise SSO"
                    description="OAuth2/OIDC single sign-on for your staff (SAML on the roadmap)."
                    action={<ShieldCheck className="size-5 text-accent" aria-hidden />}
                  />
                  <CardBody>
                    {sso === null ? <Spinner /> : sso === "none" ? (
                      <p className="text-body-sm text-fg-secondary">
                        No SSO connection configured yet. Configure one via the API
                        (<code>PUT /organisations/&#123;id&#125;/sso</code>) with your IdP’s issuer, client credentials and email domains.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={sso.enabled ? "success" : "neutral"}>{sso.enabled ? "Enabled" : "Disabled"}</Badge>
                          <span className="text-body text-fg">{sso.issuerUrl}</span>
                        </div>
                        <p className="text-body-sm text-fg-secondary">
                          Domains: {sso.emailDomains.join(", ")} · default role {sso.defaultMemberRole} · staff sign in via SSO on the login page.
                        </p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              ) : null}
            </>
          ) : null}
        </>
      )}

      <Card>
        <CardHeader
          title="API keys"
          description="Scoped keys for the partner API. Secrets are shown once and stored hashed."
          action={<KeyRound className="size-5 text-accent" aria-hidden />}
        />
        <CardBody className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input label="Key name" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. Practice management sync" />
            <Button onClick={() => void createKey()} disabled={!keyName.trim()}>Create key</Button>
          </div>
          {apiKeys.length === 0 ? (
            <p className="text-body-sm text-fg-secondary">No API keys yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {apiKeys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2">
                  <span className="text-body text-fg">{k.name} <code className="text-body-sm text-fg-secondary">{k.prefix}…</code></span>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(k.status)}>{k.status}</Badge>
                    {k.status === "ACTIVE" ? (
                      <Button size="sm" variant="danger-outline" onClick={() => void orgApi.revokeApiKey(k.id).then(reloadPersonal)}>Revoke</Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Webhooks"
          description="Signed event deliveries (document.ready, signature.sealed) with automatic retries."
          action={<Link2 className="size-5 text-accent" aria-hidden />}
        />
        <CardBody className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input label="Endpoint URL (HTTPS)" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://example.com/dlv/webhook" />
            <Button onClick={() => void createHook()} disabled={!hookUrl.trim()}>Add webhook</Button>
          </div>
          {webhooks.length === 0 ? (
            <p className="text-body-sm text-fg-secondary">No webhooks yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {webhooks.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2">
                  <span className="break-all text-body text-fg">{w.url}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(w.status)}>{w.status}</Badge>
                    {w.status === "ACTIVE" ? (
                      <Button size="sm" variant="danger-outline" onClick={() => void orgApi.disableWebhook(w.id).then(reloadPersonal)}>Disable</Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <p className="flex items-center gap-2 text-body-sm text-fg-secondary">
        <Users className="size-4" aria-hidden />
        Partner API contract: OpenAPI 3.1 — see docs/08-api in the repository.
      </p>
    </div>
  );
}
