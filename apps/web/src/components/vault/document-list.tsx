"use client";

import { FolderOpen } from "lucide-react";

import type { DocumentDto } from "@dlv/shared-types";
import { EmptyState } from "@/components/ui";

import { DocumentCard } from "./document-card";

export function DocumentList({
  documents,
  onOpen,
}: {
  documents: DocumentDto[];
  onOpen?: ((doc: DocumentDto) => void) | undefined;
}) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No documents yet"
        description="Upload your first document to start building your vault."
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} onOpen={onOpen} />
      ))}
    </div>
  );
}
