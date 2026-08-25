"use client";

import { Check, CreditCard, ExternalLink, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  PlanTier,
  type EntitlementsDto,
  type PlanDto,
  type SubscriptionDto,
  type UsageDto,
} from "@dlv/shared-types";
import { Alert, Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { billingApi } from "@/lib/billing-api";

function rand(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;
}
function gb(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${Math.round(bytes / 1024 ** 3)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}
function limitLabel(n: number | null): string {
  return n === null ? "Unlimited" : String(n);
}

export default function BillingPage() {
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsDto | null>(null);
  const [usage, setUsage] = useState<UsageDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [p, s, e] = await Promise.all([
        billingApi.listPlans(),
        billingApi.getSubscription(),
        billingApi.getEntitlements(),
      ]);
      setPlans(p);
      setSubscription(s);
      setEntitlements(e.entitlements);
      setUsage(e.usage);
    } catch {
      setError("We couldn’t load your billing details just now.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function upgrade(tier: PlanTier) {
    setBusy(tier);
    setError(null);
    try {
      const { url } = await billingApi.checkout({ tier });
      window.location.href = url;
    } catch {
      setError("Could not start checkout.");
      setBusy(null);
    }
  }

  async function manage() {
    setBusy("portal");
    try {
      const { url } = await billingApi.portal();
      window.location.href = url;
    } catch {
      setError("No billing account yet — start a plan first.");
      setBusy(null);
    }
  }

  const currentTier = subscription?.tier ?? PlanTier.FREE;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-semibold text-fg">Plans &amp; billing</h1>
        <p className="text-body text-fg-secondary">Manage your subscription and see how much of your plan you’re using.</p>
      </div>

      {error ? <Alert variant="danger" title="Something went wrong">{error}</Alert> : null}
      {subscription?.status === "GRACE" ? (
        <Alert variant="warning" title="Payment overdue">
          Your account is read-only during a grace period. Update your billing to restore full access — we never delete your data for non-payment.
        </Alert>
      ) : null}

      {entitlements && usage ? (
        <Card>
          <CardHeader
            title={`You’re on ${currentTier}`}
            action={
              currentTier === PlanTier.FREE ? (
                <Badge>Free</Badge>
              ) : (
                <Button size="sm" variant="secondary" icon={<CreditCard size={16} />} onClick={() => void manage()} loading={busy === "portal"}>
                  Manage billing
                </Button>
              )
            }
          />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Meter label="Documents" value={usage.documents} max={entitlements.maxDocuments} />
            <Meter label="Storage" value={usage.storageBytes} max={entitlements.storageBytes} format={gb} />
            <Meter label="Signatures this month" value={usage.signaturesThisMonth} max={entitlements.signaturesPerMonth} />
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const canUpgrade =
            !isCurrent && [PlanTier.PREMIUM, PlanTier.FAMILY, PlanTier.PROFESSIONAL].includes(plan.tier);
          return (
            <Card key={plan.tier}>
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-body font-medium text-fg">{plan.name}</p>
                  {isCurrent ? <Badge variant="success">Current</Badge> : null}
                </div>
                <p className="text-h3 font-semibold text-fg">
                  {plan.priceZarCents === 0 ? "Free" : rand(plan.priceZarCents)}
                  {plan.priceZarCents > 0 ? <span className="text-body-sm font-normal text-fg-muted"> /mo</span> : null}
                </p>
                <ul className="flex flex-col gap-1.5 text-body-sm text-fg-secondary">
                  <li className="flex items-center gap-2"><Check size={15} /> {gb(plan.entitlements.storageBytes)} storage</li>
                  <li className="flex items-center gap-2"><Check size={15} /> {limitLabel(plan.entitlements.maxDocuments)} documents</li>
                  <li className="flex items-center gap-2"><Check size={15} /> {limitLabel(plan.entitlements.signaturesPerMonth)} signatures/mo</li>
                  {plan.entitlements.familyMembers > 0 ? (
                    <li className="flex items-center gap-2"><Check size={15} /> {plan.entitlements.familyMembers} family members</li>
                  ) : null}
                </ul>
                {canUpgrade ? (
                  <Button icon={<Sparkles size={16} />} onClick={() => void upgrade(plan.tier)} loading={busy === plan.tier} className="mt-1 self-start">
                    Upgrade
                  </Button>
                ) : plan.tier === PlanTier.ENTERPRISE ? (
                  <Button variant="secondary" icon={<ExternalLink size={16} />} className="mt-1 self-start" onClick={() => setError("Enterprise is sales-led — contact us for a quote.")}>
                    Contact sales
                  </Button>
                ) : null}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Meter({
  label,
  value,
  max,
  format,
}: {
  label: string;
  value: number;
  max: number | null;
  format?: (n: number) => string;
}) {
  const fmt = format ?? ((n: number) => String(n));
  const pct = max === null || max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="rounded-md bg-subtle p-3">
      <p className="text-body-sm text-fg-muted">{label}</p>
      <p className="text-body font-medium text-fg">
        {fmt(value)} <span className="text-fg-muted">/ {max === null ? "∞" : fmt(max)}</span>
      </p>
      {max !== null ? (
        <div className="mt-2 h-1.5 rounded-full bg-border">
          <div className="h-1.5 rounded-full bg-accent" style={{ width: `${String(pct)}%` }} />
        </div>
      ) : null}
    </div>
  );
}
