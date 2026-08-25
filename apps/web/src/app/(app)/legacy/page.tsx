"use client";

import { HeartHandshake, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { BeneficiaryDto, EmergencyAccessRequestDto, ExecutorDto } from "@dlv/shared-types";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Input } from "@/components/ui";
import { legacyApi } from "@/lib/legacy-api";

/**
 * The "Legacy" hub — the people you trust and posthumous access. Copy is
 * deliberately warm and plain-language (design-system §9 bereavement flows).
 */
export default function LegacyPage() {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryDto[]>([]);
  const [executors, setExecutors] = useState<ExecutorDto[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyAccessRequestDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [bName, setBName] = useState("");
  const [bEmail, setBEmail] = useState("");
  const [bRel, setBRel] = useState("");
  const [xName, setXName] = useState("");
  const [xEmail, setXEmail] = useState("");

  const reload = useCallback(async () => {
    try {
      const [b, x, e] = await Promise.all([
        legacyApi.listBeneficiaries(),
        legacyApi.listExecutors(),
        legacyApi.listEmergencyRequests(),
      ]);
      setBeneficiaries(b);
      setExecutors(x);
      setEmergencies(e);
    } catch {
      setError("We couldn’t load your legacy details just now.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function addBeneficiary() {
    if (!bName || !bEmail) return;
    await legacyApi.addBeneficiary({ fullName: bName, email: bEmail, relationship: bRel || "Family" });
    setBName("");
    setBEmail("");
    setBRel("");
    await reload();
  }
  async function addExecutor() {
    if (!xName || !xEmail) return;
    await legacyApi.addExecutor({ fullName: xName, email: xEmail });
    setXName("");
    setXEmail("");
    await reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-h2 font-semibold text-fg">
          <HeartHandshake size={24} strokeWidth={1.5} className="text-accent-text" aria-hidden="true" />
          Your legacy
        </h1>
        <p className="text-body text-fg-secondary">
          Decide who can help, and who inherits what you’ve kept safe — gently, and on your terms.
        </p>
      </div>

      {error ? <Alert variant="danger" title="Something went wrong">{error}</Alert> : null}

      {emergencies.length > 0 ? (
        <Card>
          <CardHeader title="Emergency access requests" />
          <CardBody className="flex flex-col gap-3">
            {emergencies.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm text-fg">
                    {r.isDeathClaim ? "Death claim" : "Emergency"} · scope {r.scope.toLowerCase()}
                  </p>
                  <p className="text-caption text-fg-muted">
                    Available after {new Date(r.delayUntil).toLocaleString()} · {r.approvalCount} approval(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "ACTIVE" ? "danger" : "warning"}>{r.status}</Badge>
                  <Button size="sm" variant="danger-outline" onClick={() => void legacyApi.denyEmergency(r.id).then(reload)}>
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Beneficiaries" description="The people you’d like to inherit or receive access." />
          <CardBody className="flex flex-col gap-3">
            {beneficiaries.length === 0 ? (
              <EmptyState icon={UserPlus} title="No beneficiaries yet" description="Add someone you trust." />
            ) : (
              beneficiaries.map((b) => (
                <div key={b.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-body-sm font-medium text-fg">{b.fullName}</p>
                    <p className="text-caption text-fg-muted">{b.relationship} · {b.email}</p>
                  </div>
                  <Button size="sm" variant="ghost" icon={<Trash2 size={16} />} onClick={() => void legacyApi.removeBeneficiary(b.id).then(reload)}>
                    Remove
                  </Button>
                </div>
              ))
            )}
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Input label="Full name" value={bName} onChange={(e) => setBName(e.target.value)} />
              <Input label="Email" type="email" value={bEmail} onChange={(e) => setBEmail(e.target.value)} />
              <Input label="Relationship" value={bRel} onChange={(e) => setBRel(e.target.value)} placeholder="e.g. Daughter" />
              <Button onClick={() => void addBeneficiary()} disabled={!bName || !bEmail}>Add beneficiary</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Executors" description="Trusted people who can act on your estate when needed." />
          <CardBody className="flex flex-col gap-3">
            {executors.length === 0 ? (
              <EmptyState icon={UserPlus} title="No executors yet" description="Name someone to help settle your estate." />
            ) : (
              executors.map((x) => (
                <div key={x.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-body-sm font-medium text-fg">{x.fullName}</p>
                    <p className="text-caption text-fg-muted">{x.email}</p>
                  </div>
                  <Button size="sm" variant="ghost" icon={<Trash2 size={16} />} onClick={() => void legacyApi.removeExecutor(x.id).then(reload)}>
                    Remove
                  </Button>
                </div>
              ))
            )}
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Input label="Full name" value={xName} onChange={(e) => setXName(e.target.value)} />
              <Input label="Email" type="email" value={xEmail} onChange={(e) => setXEmail(e.target.value)} />
              <Button onClick={() => void addExecutor()} disabled={!xName || !xEmail}>Add executor</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
