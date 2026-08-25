"use client";

import { Link2 } from "lucide-react";
import QRCode from "qrcode";
import { useState } from "react";

import type { DocumentDto } from "@dlv/shared-types";
import { Alert, Button, Input, Modal } from "@/components/ui";
import { legacyApi } from "@/lib/legacy-api";

/** Share a document by email or as an expiring secure link (with a QR code). */
export function ShareDialog({ doc, onClose }: { doc: DocumentDto | null; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedWith, setSharedWith] = useState<string | null>(null);

  async function shareByEmail() {
    if (!doc || !email) return;
    setBusy(true);
    setError(null);
    try {
      await legacyApi.createShare({ documentId: doc.id, recipientEmail: email });
      setSharedWith(email);
      setEmail("");
    } catch {
      setError("Could not share. Please check the email and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function createLink() {
    if (!doc) return;
    setBusy(true);
    setError(null);
    try {
      const link = await legacyApi.createSecureLink({ documentId: doc.id, expiresInDays: 7 });
      if (link.url) {
        setLinkUrl(link.url);
        setQr(await QRCode.toDataURL(link.url, { margin: 1, width: 200 }));
      }
    } catch {
      setError("Could not create a secure link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={doc !== null} onClose={onClose} title={doc ? `Share “${doc.title}”` : "Share"} size="md">
      <div className="flex flex-col gap-5">
        {error ? <Alert variant="danger" title="Something went wrong">{error}</Alert> : null}
        {sharedWith ? <Alert variant="success" title="Shared">Access sent to {sharedWith}.</Alert> : null}

        <section className="flex flex-col gap-2">
          <Input
            label="Share with someone by email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
          <Button onClick={() => void shareByEmail()} loading={busy} disabled={!email}>
            Send access
          </Button>
        </section>

        <section className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-body-sm text-fg-secondary">
            Or create a secure link that expires in 7 days. Anyone with the link can view the document.
          </p>
          <Button variant="secondary" icon={<Link2 size={16} />} onClick={() => void createLink()} loading={busy}>
            Create secure link
          </Button>
          {linkUrl ? (
            <div className="mt-2 flex flex-col items-center gap-3 rounded-md bg-subtle p-4">
              <code className="w-full truncate text-caption text-fg">{linkUrl}</code>
              {qr ? <img src={qr} alt="QR code for the secure link" width={160} height={160} /> : null}
            </div>
          ) : null}
        </section>
      </div>
    </Modal>
  );
}
