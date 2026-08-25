"use client";

import { Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { AiPreferenceDto, AiUsageSummaryDto } from "@dlv/shared-types";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Spinner } from "@/components/ui";
import { aiApi } from "@/lib/ai-api";

function costLabel(microUsd: number): string {
  return `$${(microUsd / 1_000_000).toFixed(4)}`;
}

export default function AiSettingsPage() {
  const [pref, setPref] = useState<AiPreferenceDto | null>(null);
  const [usage, setUsage] = useState<AiUsageSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [p, u] = await Promise.all([aiApi.getPreferences(), aiApi.usage()]);
      setPref(p);
      setUsage(u);
    } catch {
      setError("We couldn’t load your AI settings.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function toggle() {
    if (!pref) return;
    setSaving(true);
    setError(null);
    try {
      setPref(await aiApi.updatePreferences({ aiEnabled: !pref.aiEnabled }));
    } catch {
      setError("Could not update your AI preference.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-h1 text-fg">AI &amp; your data</h1>
        <p className="text-body-sm text-fg-secondary">Exactly what our AI features can and cannot see — and one switch to turn them all off.</p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Card>
        <CardHeader
          title="How AI is used"
          description="Digital Legacy Vault uses Anthropic Claude through our own gateway."
        />
        <CardBody className="flex flex-col gap-3 text-body text-fg">
          <p>
            When enabled, AI can classify your documents into categories, summarise them, suggest
            documents your estate plan is missing, and interpret plain-language search queries. It
            reads only the extracted text of documents in your standard vault, and only when you ask.
          </p>
          <div className="flex items-start gap-3 rounded-lg border border-border p-4">
            <Lock className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <p className="text-body-sm text-fg-secondary">
              <strong className="text-fg">Client-encrypted items are never processed.</strong> They are
              encrypted in your browser with keys we never hold; the exclusion is enforced in code and
              audited — not a policy promise.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <p className="text-body-sm text-fg-secondary">
              Every AI request is recorded in your audit trail with its estimated cost, and your plan
              includes a monthly AI allowance plus a daily budget cap.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="AI features"
          description="One switch for classification, summaries, recommendations and natural-language search."
          action={
            pref === null ? <Spinner size={16} /> : (
              <Button variant={pref.aiEnabled ? "secondary" : "primary"} onClick={() => void toggle()} disabled={saving}>
                <Sparkles className="size-4" />
                {pref.aiEnabled ? "Turn off AI" : "Turn on AI"}
              </Button>
            )
          }
        />
        <CardBody>
          {pref === null ? (
            <Spinner />
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant={pref.aiEnabled ? "success" : "neutral"}>
                {pref.aiEnabled ? "Enabled" : "Off"}
              </Badge>
              <span className="text-body-sm text-fg-secondary">
                {pref.aiEnabled
                  ? "AI features are on. Turning them off stops all AI processing immediately."
                  : "AI features are off. Nothing you store is sent to any AI model."}
              </span>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your AI usage" description="Instrumented per request — this is what the budget caps look at." />
        <CardBody>
          {usage === null ? (
            <Spinner />
          ) : (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-body-sm text-fg-secondary">Requests today</dt>
                <dd className="text-h3 text-fg">{usage.requestsToday} / {usage.dailyCap}</dd>
              </div>
              <div>
                <dt className="text-body-sm text-fg-secondary">Documents this month</dt>
                <dd className="text-h3 text-fg">
                  {usage.docsThisMonth}{usage.docsPerMonthLimit !== null ? ` / ${String(usage.docsPerMonthLimit)}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-body-sm text-fg-secondary">Est. cost this month</dt>
                <dd className="text-h3 text-fg">{costLabel(usage.estCostMicroUsdThisMonth)}</dd>
              </div>
              <div>
                <dt className="text-body-sm text-fg-secondary">Plan limit</dt>
                <dd className="text-h3 text-fg">{usage.docsPerMonthLimit === null ? "Unlimited" : `${String(usage.docsPerMonthLimit)} docs`}</dd>
              </div>
            </dl>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
