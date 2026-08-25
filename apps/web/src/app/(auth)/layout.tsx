import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Digital Legacy Vault — home" className="rounded-md">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main id="main-content" className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
      <footer className="px-4 py-6 text-center">
        <p className="text-caption text-fg-muted">
          Protected with AES-256 encryption. POPIA compliant. Built by Stellr SA.
        </p>
      </footer>
    </div>
  );
}
