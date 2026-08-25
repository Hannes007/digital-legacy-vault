"use client";

import { useCallback, useEffect, useState } from "react";

import type { DocumentDto } from "@dlv/shared-types";
import { Alert } from "@/components/ui";
import { DocumentList } from "@/components/vault/document-list";
import { DocumentPreview } from "@/components/vault/document-preview";
import { Dropzone } from "@/components/vault/dropzone";
import { ShareDialog } from "@/components/sharing/share-dialog";
import { vaultApi } from "@/lib/vault-api";

export default function VaultPage() {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<DocumentDto | null>(null);
  const [shareDoc, setShareDoc] = useState<DocumentDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setDocuments(await vaultApi.listDocuments());
    } catch {
      setError("Could not load your documents.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        await vaultApi.uploadFile(file);
        await reload();
      } catch {
        setError(`Upload of "${file.name}" failed.`);
      } finally {
        setUploading(false);
      }
    },
    [reload],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-semibold text-fg">Vault</h1>
        <p className="text-body text-fg-secondary">Your encrypted documents, safe for life and legacy.</p>
      </div>

      {error ? <Alert variant="danger" title="Something went wrong">{error}</Alert> : null}

      <Dropzone onFile={handleFile} busy={uploading} />
      <DocumentList documents={documents} onOpen={setSelected} />
      <DocumentPreview
        doc={selected}
        onClose={() => setSelected(null)}
        onShare={(d) => {
          setSelected(null);
          setShareDoc(d);
        }}
      />
      <ShareDialog doc={shareDoc} onClose={() => setShareDoc(null)} />
    </div>
  );
}
