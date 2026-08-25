import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're offline",
};

export default function OfflinePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <WifiOff size={48} strokeWidth={1.5} aria-hidden="true" className="text-fg-muted" />
      <h1 className="text-h1 text-fg">You&rsquo;re offline</h1>
      <p className="max-w-[48ch] text-body text-fg-secondary">
        Digital Legacy Vault needs a connection to show your latest information. Your vault is
        safe — we&rsquo;ll be ready when you&rsquo;re back online.
      </p>
      <a
        href="/dashboard"
        className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-body font-medium text-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-hover"
      >
        Try again
      </a>
    </main>
  );
}
