"use client";

import { useEffect, useState } from "react";

import type { DocumentDto, DocumentVersionDto, TimelineEntryDto } from "@dlv/shared-types";
import { Button, Modal, Spinner } from "@/components/ui";
import { vaultApi } from "@/lib/vault-api";

import { Timeline } from "./timeline";

/** Document detail: metadata, version history, and the audit timeline. */
export function DocumentPreview({
  doc,
  onClose,
  onShare,
}: {
  doc: DocumentDto | null;
  onClose: () => void;
  onShare?: ((doc: DocumentDto) => void) | undefined;
}) {
  const [versions, setVersions] = useState<DocumentVersionDto[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntryDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([vaultApi.listVersions(doc.id), vaultApi.timeline(doc.id)])
      .then(([v, t]) => {
        if (!cancelled) {
          setVersions(v);
          setTimeline(t);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doc]);

  return (
    <Modal open={doc !== null} onClose={onClose} title={doc?.title ?? "Document"} size="lg">
      {doc ? (
        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-2 gap-3 text-body-sm">
            <div>
              <dt className="text-fg-muted">Type</dt>
              <dd className="text-fg">{doc.type.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Status</dt>
              <dd className="text-fg">{doc.status.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">SHA-256</dt>
              <dd className="truncate font-mono text-caption text-fg">{doc.sha256 || "—"}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Version</dt>
              <dd className="text-fg">v{doc.currentVersion}</dd>
            </div>
          </dl>

          {onShare && doc ? (
            <div>
              <Button size="sm" variant="secondary" onClick={() => onShare(doc)}>
                Share…
              </Button>
            </div>
          ) : null}

          {loading ? (
            <Spinner size={24} label="Loading document detail" />
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-h4 font-semibold text-fg">Versions</h3>
                <ul className="flex flex-col gap-1 text-body-sm text-fg-secondary">
                  {versions.map((v) => (
                    <li key={v.id}>
                      v{v.version} · {v.scanVerdict} · {new Date(v.createdAt).toLocaleDateString()}
                    </li>
                  ))}
                  {versions.length === 0 ? <li>No versions yet.</li> : null}
                </ul>
              </section>
              <section>
                <h3 className="mb-2 text-h4 font-semibold text-fg">Activity</h3>
                <Timeline entries={timeline} />
              </section>
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
