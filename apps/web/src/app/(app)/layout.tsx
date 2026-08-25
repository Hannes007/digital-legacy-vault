"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { InstallPrompt } from "@/components/app/install-prompt";
import { MobileTabBar } from "@/components/app/mobile-tab-bar";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

/**
 * Authenticated shell. middleware.ts already redirects visitors without the
 * dlv_auth flag; this client guard covers the stale-cookie case where the
 * refresh-token exchange fails after load.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <Spinner size={32} label="Opening your vault" />
        <p className="text-body-sm text-fg-secondary">Opening your vault…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[264px_1fr]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <Topbar user={user} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-24 pt-8 sm:px-6 md:pb-12 lg:px-8"
        >
          <InstallPrompt />
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
