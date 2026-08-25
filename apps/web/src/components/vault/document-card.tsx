"use client";

import { FileText } from "lucide-react";

import { DocumentStatus, type DocumentDto } from "@dlv/shared-types";
import { Badge, Card, CardBody, type BadgeVariant } from "@/components/ui";

function statusVariant(status: DocumentStatus): BadgeVariant {
  switch (status) {
    case DocumentStatus.READY:
      return "success";
    case DocumentStatus.SCANNING:
    case DocumentStatus.PENDING_UPLOAD:
      return "warning";
    case DocumentStatus.INFECTED:
    case DocumentStatus.INVALID:
    case DocumentStatus.FAILED:
      return "danger";
    default:
      return "neutral";
  }
}

function humanSize(bytes: number): string {
  if (bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function DocumentCard({ doc, onOpen }: { doc: DocumentDto; onOpen?: ((doc: DocumentDto) => void) | undefined }) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-[var(--shadow-md)]"
      onClick={() => onOpen?.(doc)}
    >
      <CardBody className="flex items-start gap-3">
        <span className="mt-0.5 rounded-md bg-accent-subtle p-2 text-accent-text" aria-hidden="true">
          <FileText size={20} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-fg">{doc.title}</p>
          <p className="text-body-sm text-fg-secondary">
            {doc.type.replaceAll("_", " ")} · {humanSize(doc.sizeBytes)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={statusVariant(doc.status)}>{doc.status.replaceAll("_", " ")}</Badge>
            {doc.tags.slice(0, 3).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
