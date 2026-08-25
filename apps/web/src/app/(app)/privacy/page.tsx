"use client";

import { Download, FileClock, ShieldCheck, ShieldX, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  ConsentStatus,
  type ConsentDto,
  type DataSubjectRequestDto,
  type ErasureResultDto,
} from "@dlv/shared-types";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Modal } from "@/components/ui";
import { complianceApi } from "@/lib/compliance-api";

/**
 * Privacy & data (Phase 5). POPIA/GDPR self-service: export a portable copy of
 * your data, review and withdraw consents, and request erasure (which is refused
 * while a legal hold applies).
 */
export default function PrivacyPage() {
  const [consents, setConsents] = useState<ConsentDto[]>([]);
  const [requests, setRequests] = useState<DataSubjectRequestDto[]>([]);
  const [erasure, setErasure] = useState<ErasureResultDto | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([complianceApi.listConsents(), complianceApi.listDsrRequests()]);
      setConsents(c);
      setRequests(r);
    } catch {
      setError("We couldn’t load your privacy details just now.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function exportData() {
    setBusy(true);
    setError(null);
    try {
      const bundle = await complianceApi.exportData();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dlv-data-export-${bundle.generatedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await reload();
    } catch {
      setError("Could not generate your export.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: string) {
    try {
      await complianceApi.withdrawConsent(id);
      await reload();
    } catch {
      setError("Could not withdraw that consent.");
    }
  }

  async function requestErasure() {
    setBusy(true);
    setError(null);
    try {
      const result = await complianceApi.requestErasure();
      setErasure(result);
      setConfirmErase(false);
      await reload();
    } catch {
      setError("Could not process the erasure request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-semibold text-fg">Privacy &amp; data</h1>
        <p className="text-body text-fg-secondary">
          Your rights under POPIA and the GDPR: get a copy of your data, manage your consents, and
          request erasure of your account.
        </p>
      </div>

      {error ? <Alert variant="danger" title="Something went wrong">{error}</Alert> : null}

      {erasure ? (
        <Alert
          variant={erasure.status === "COMPLETED" ? "success" : "warning"}
          title={erasure.status === "COMPLETED" ? "Erasure completed" : "Erasure refused"}
        >
          <span className="flex items-center gap-2">
            {erasure.status === "COMPLETED" ? <ShieldCheck size={16} /> : <ShieldX size={16} />}
            {erasure.detail}
          </span>
        </Alert>
      ) : null}

      <Card>
        <CardHeader title="Export your data" />
        <CardBody className="flex flex-col gap-4">
          <p className="text-body-sm text-fg-secondary">
            Download a machine-readable copy of your profile, documents, signatures, consents, and
            client-encrypted item labels.
          </p>
          <Button icon={<Download size={16} />} onClick={() => void exportData()} loading={busy} className="self-start">
            Export my data (JSON)
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Consents" />
        <CardBody className="flex flex-col gap-3">
          {consents.length === 0 ? (
            <p className="text-body-sm text-fg-muted">You have no recorded consents yet.</p>
          ) : (
            consents.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-4">
                <div>
                  <p className="flex items-center gap-2 text-body font-medium text-fg">
                    {c.purpose.replaceAll("_", " ")}
                    <Badge variant={c.status === ConsentStatus.GRANTED ? "success" : "neutral"}>{c.status}</Badge>
                  </p>
                  <p className="text-body-sm text-fg-muted">{c.statementText}</p>
                </div>
                {c.status === ConsentStatus.GRANTED ? (
                  <Button size="sm" variant="secondary" onClick={() => void withdraw(c.id)}>
                    Withdraw
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Delete your account" />
        <CardBody className="flex flex-col gap-4">
          <p className="text-body-sm text-fg-secondary">
            Erasure destroys the keys to your stored documents (making them unrecoverable), deletes
            your client-encrypted items, revokes your sessions, and anonymises your profile. It will
            be refused if a legal hold currently applies to your account.
          </p>
          <Button variant="danger-outline" icon={<Trash2 size={16} />} onClick={() => setConfirmErase(true)} className="self-start">
            Request erasure
          </Button>
        </CardBody>
      </Card>

      {requests.length > 0 ? (
        <Card>
          <CardHeader title="Request history" />
          <CardBody className="flex flex-col gap-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 text-body-sm">
                <span className="flex items-center gap-2 text-fg">
                  <FileClock size={16} aria-hidden="true" />
                  {r.type} · {new Date(r.createdAt).toLocaleString()}
                </span>
                <Badge variant={r.status === "COMPLETED" ? "success" : r.status === "REFUSED" ? "warning" : "neutral"}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : (
        <EmptyState icon={FileClock} title="No requests yet" description="Your export and erasure requests will be listed here." />
      )}

      <Modal
        open={confirmErase}
        onClose={() => setConfirmErase(false)}
        title="Request account erasure?"
        description="This cannot be undone. Your documents’ keys are destroyed and your profile is anonymised."
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmErase(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void requestErasure()} loading={busy}>
              Erase my account
            </Button>
          </div>
        }
      >
        <p className="text-body-sm text-fg-secondary">
          If a legal hold applies to your account, the request will be safely refused and nothing will
          be deleted.
        </p>
      </Modal>
    </div>
  );
}
