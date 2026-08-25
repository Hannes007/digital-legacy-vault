"use client";

import { Search, ShieldAlert, User } from "lucide-react";
import { useState } from "react";

import type { AuditEventDto, UserSupportSummaryDto } from "@dlv/shared-types";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { adminApi } from "@/lib/admin-api";

export default function AdminPage() {
  const [eventType, setEventType] = useState("");
  const [resource, setResource] = useState("");
  const [events, setEvents] = useState<AuditEventDto[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [userId, setUserId] = useState("");
  const [summary, setSummary] = useState<UserSupportSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search() {
    setBusy(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (eventType) params.eventType = eventType;
      if (resource) params.resource = resource;
      const res = await adminApi.searchAudit(params);
      setEvents(res.events);
      setTruncated(res.truncated);
    } catch {
      setError("Search failed — back-office access is limited to support and platform roles.");
    } finally {
      setBusy(false);
    }
  }

  async function lookup() {
    if (!userId) return;
    setError(null);
    try {
      setSummary(await adminApi.userSummary(userId.trim()));
    } catch {
      setError("Could not load that user.");
      setSummary(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-accent-subtle p-2 text-accent-text">
          <ShieldAlert size={22} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-h2 font-semibold text-fg">Back-office</h1>
          <p className="text-body text-fg-secondary">Support tooling: search the audit trail and look up a user. Every lookup is itself audited.</p>
        </div>
      </div>

      {error ? <Alert variant="danger" title="Something went wrong">{error}</Alert> : null}

      <Card>
        <CardHeader title="Audit search" />
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Event type" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="signature.sealed" />
            <Input label="Resource" value={resource} onChange={(e) => setResource(e.target.value)} placeholder="document:" />
            <Button icon={<Search size={16} />} onClick={() => void search()} loading={busy}>Search</Button>
          </div>
          {events ? (
            events.length === 0 ? (
              <p className="text-body-sm text-fg-muted">No matching events.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {truncated ? <p className="text-body-sm text-fg-muted">Showing the first page of results.</p> : null}
                {events.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2.5 text-body-sm">
                    <span className="font-medium text-fg">{e.eventType}</span>
                    <span className="text-fg-muted">{e.resource}</span>
                    <span className="text-fg-muted">{new Date(e.occurredAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="User lookup" />
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid" />
            <Button variant="secondary" icon={<User size={16} />} onClick={() => void lookup()} disabled={!userId}>Look up</Button>
          </div>
          {summary ? (
            <div className="rounded-md border border-border p-4 text-body-sm">
              <p className="text-body font-medium text-fg">{summary.firstName} {summary.lastName}</p>
              <p className="text-fg-muted">{summary.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{summary.status}</Badge>
                {summary.subscription ? <Badge variant="success">{summary.subscription.tier} · {summary.subscription.status}</Badge> : <Badge>FREE</Badge>}
                {summary.roles.map((r) => <Badge key={r}>{r}</Badge>)}
              </div>
              <p className="mt-3 text-fg-secondary">
                {summary.usage.documents} documents · {summary.usage.vaults} vaults · {summary.usage.signaturesTotal} signatures
              </p>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
