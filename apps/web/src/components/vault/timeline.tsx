"use client";

import { ShieldCheck } from "lucide-react";

import type { TimelineEntryDto } from "@dlv/shared-types";

/** Document activity timeline (audit context + hash chain, roadmap §3). */
export function Timeline({ entries }: { entries: TimelineEntryDto[] }) {
  if (entries.length === 0) {
    return <p className="text-body-sm text-fg-secondary">No activity recorded yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-4">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3">
          <span className="mt-0.5 text-accent-text" aria-hidden="true">
            <ShieldCheck size={18} strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-fg">{e.summary}</p>
            <p className="text-caption text-fg-muted">
              {new Date(e.occurredAt).toLocaleString()} · chain {e.eventHash.slice(0, 12)}…
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
