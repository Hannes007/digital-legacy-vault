"use client";

import { BadgeCheck, FileSignature, ShieldCheck, ShieldX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DocumentStatus,
  type DocumentDto,
  type SealVerificationDto,
  type SignatureRequestDto,
} from "@dlv/shared-types";
import { Alert, Badge, Button, Card, CardBody, EmptyState, Input } from "@/components/ui";
import { CeremonyDialog } from "@/components/signature/ceremony-dialog";
import { signatureApi } from "@/lib/signature-api";
import { vaultApi } from "@/lib/vault-api";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning"> = {
  PENDING: "warning",
  COMPLETED: "success",
};

export default function SignaturesPage() {
  const [requests, setRequests] = useState<SignatureRequestDto[]>([]);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [ceremony, setCeremony] = useState<SignatureRequestDto | null>(null);
  const [verifications, setVerifications] = useState<Record<string, SealVerificationDto>>({});
  const [error, setError] = useState<string | null>(null);

  // Create-request form.
  const [documentId, setDocumentId] = useState("");
  const [title, setTitle] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const readyDocuments = useMemo(
    () => documents.filter((d) => d.status === DocumentStatus.READY),
    [documents],
  );

  const reload = useCallback(async () => {
    try {
      const [reqs, docs] = await Promise.all([signatureApi.listRequests(), vaultApi.listDocuments()]);
      setRequests(reqs);
      setDocuments(docs);
    } catch {
      setError("Could not load your signature requests.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function createRequest() {
    if (!documentId || !title || !signerName || !signerEmail) return;
    setCreating(true);
    setError(null);
    try {
      await signatureApi.createRequest({ documentId, title, signerName, signerEmail });
      setDocumentId("");
      setTitle("");
      setSignerName("");
      setSignerEmail("");
      await reload();
    } catch {
      setError("Could not create the signature request.");
    } finally {
      setCreating(false);
    }
  }

  async function verify(req: SignatureRequestDto) {
    if (!req.signatureId) return;
    try {
      const result = await signatureApi.verify(req.signatureId);
      setVerifications((prev) => ({ ...prev, [req.id]: result }));
    } catch {
      setError("Could not verify the seal.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-semibold text-fg">Signatures</h1>
        <p className="text-body text-fg-secondary">
          Sign directives and mandates with an ECTA-aligned electronic signature, sealed and
          trusted-timestamped. Wills still require wet-ink execution — DLV preserves the evidence.
        </p>
      </div>

      {error ? <Alert variant="danger" title="Something went wrong">{error}</Alert> : null}

      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="text-h4 font-semibold text-fg">Request a signature</h2>
          {readyDocuments.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Upload a document to the vault first, then request a signature here.</p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-body-sm font-medium text-fg">Document</span>
                <select
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="h-10 rounded-md border border-border-strong bg-surface px-3 text-fg"
                >
                  <option value="">Select a ready document…</option>
                  {readyDocuments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Power of attorney" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Signer name" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                <Input label="Signer email" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
              </div>
              <Button
                icon={<FileSignature size={16} />}
                onClick={() => void createRequest()}
                loading={creating}
                disabled={!documentId || !title || !signerName || !signerEmail}
                className="self-start"
              >
                Create request
              </Button>
            </>
          )}
        </CardBody>
      </Card>

      {requests.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No signature requests yet"
          description="Requests you create will appear here, ready to sign and seal."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((req) => {
            const verification = verifications[req.id];
            return (
              <li key={req.id}>
                <Card>
                  <CardBody className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-body font-medium text-fg">{req.title}</p>
                        <p className="text-body-sm text-fg-muted">For {req.signerName} · {req.signerEmail}</p>
                      </div>
                      <Badge variant={STATUS_TONE[req.status] ?? "neutral"}>{req.status}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {req.status === "PENDING" ? (
                        <Button size="sm" icon={<ShieldCheck size={16} />} onClick={() => setCeremony(req)}>
                          Sign &amp; seal
                        </Button>
                      ) : null}
                      {req.status === "COMPLETED" && req.signatureId ? (
                        <Button size="sm" variant="secondary" icon={<BadgeCheck size={16} />} onClick={() => void verify(req)}>
                          Verify seal
                        </Button>
                      ) : null}
                    </div>

                    {verification ? (
                      <Alert
                        variant={verification.valid ? "success" : "danger"}
                        title={verification.valid ? "Seal verified" : "Seal verification failed"}
                      >
                        <span className="flex items-center gap-2">
                          {verification.valid ? <ShieldCheck size={16} /> : <ShieldX size={16} />}
                          {verification.details}
                        </span>
                      </Alert>
                    ) : null}
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <CeremonyDialog
        request={ceremony}
        onClose={() => setCeremony(null)}
        onSealed={() => {
          setCeremony(null);
          void reload();
        }}
      />
    </div>
  );
}
