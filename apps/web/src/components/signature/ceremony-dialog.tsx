"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import type { SignatureDto, SignatureRequestDto } from "@dlv/shared-types";
import { Alert, Button, Modal } from "@/components/ui";
import { signatureApi } from "@/lib/signature-api";

import { SignaturePad, type SignatureCapture } from "./signature-pad";

const CONSENT_TEXT =
  "I confirm that I intend to sign this document electronically, that I am the named signer, " +
  "and that my electronic signature is as legally binding as a handwritten one under the " +
  "Electronic Communications and Transactions Act (ECTA).";

/**
 * Signing ceremony (PROJECT_MEMORY §2.9): capture the signature, record explicit
 * consent, then seal — the server binds it to the document with a trusted
 * timestamp. Wills note: DLV preserves evidence, it does not replace wet-ink
 * execution required by the Wills Act (§2.2).
 */
export function CeremonyDialog({
  request,
  onClose,
  onSealed,
}: {
  request: SignatureRequestDto | null;
  onClose: () => void;
  onSealed: (signature: SignatureDto) => void;
}) {
  const [capture, setCapture] = useState<SignatureCapture | null>(null);
  const [consented, setConsented] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function seal() {
    if (!request || !capture || !consented) return;
    setBusy(true);
    setError(null);
    try {
      const signature = await signatureApi.sign(request.id, {
        method: capture.method,
        signatureImage: capture.signatureImage,
        consentText: CONSENT_TEXT,
      });
      onSealed(signature);
    } catch {
      setError("We couldn't seal your signature. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={request !== null}
      onClose={onClose}
      title={request ? `Sign “${request.title}”` : "Sign"}
      description="Add your signature, confirm your consent, and we'll seal it with a trusted timestamp."
      size="md"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button icon={<ShieldCheck size={16} />} onClick={() => void seal()} loading={busy} disabled={!capture || !consented}>
            Sign &amp; seal
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {error ? <Alert variant="danger" title="Something went wrong">{error}</Alert> : null}

        <SignaturePad onChange={setCapture} />

        <label className="flex items-start gap-3 rounded-md bg-subtle p-4">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="text-body-sm text-fg-secondary">{CONSENT_TEXT}</span>
        </label>
      </div>
    </Modal>
  );
}
