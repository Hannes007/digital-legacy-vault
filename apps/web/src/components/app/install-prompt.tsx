"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

/** Minimal shape of the non-standard beforeinstallprompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA install banner (Phase 6). Appears once the browser fires
 * `beforeinstallprompt`; dismissible for the session. Adds the "install DLV"
 * affordance the PWA-completion deliverable calls for.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!deferred || dismissed) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className="mx-auto mb-4 flex max-w-[1120px] items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <Download size={18} className="text-accent-text" aria-hidden="true" />
        <span className="text-body-sm text-fg-secondary">Install DLV for quick, offline-ready access.</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => void install()}
          className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-body-sm font-medium text-on-accent hover:bg-accent-hover"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss install prompt"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-subtle"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
