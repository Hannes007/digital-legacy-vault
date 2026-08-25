import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-canvas/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Digital Legacy Vault — home"
            className="rounded-md"
          >
            <Logo />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            <a
              href="#features"
              className="rounded-sm py-2 text-body-sm font-medium text-fg-secondary transition-colors duration-[var(--duration-micro)] hover:text-fg"
            >
              How it helps
            </a>
            <a
              href="#security"
              className="rounded-sm py-2 text-body-sm font-medium text-fg-secondary transition-colors duration-[var(--duration-micro)] hover:text-fg"
            >
              Security
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-body font-medium text-fg-secondary transition-colors duration-[var(--duration-micro)] hover:bg-subtle hover:text-fg"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-body font-medium text-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-hover"
            >
              Create your vault
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div className="flex max-w-[44ch] flex-col gap-3">
              <Logo />
              <p className="text-body-sm text-fg-secondary">
                A secure digital estate vault for individuals, families, and the professionals
                who serve them. Built by Stellr SA.
              </p>
            </div>
            <nav aria-label="Footer" className="flex flex-col gap-2">
              <span className="text-overline uppercase tracking-overline text-fg-muted">
                Product
              </span>
              <a
                href="#features"
                className="rounded-sm py-1 text-body-sm text-fg-secondary hover:text-fg"
              >
                How it helps
              </a>
              <a
                href="#security"
                className="rounded-sm py-1 text-body-sm text-fg-secondary hover:text-fg"
              >
                Security
              </a>
              <Link
                href="/register"
                className="rounded-sm py-1 text-body-sm text-fg-secondary hover:text-fg"
              >
                Create your vault
              </Link>
            </nav>
          </div>
          <p className="max-w-[72ch] text-caption text-fg-muted">
            Digital Legacy Vault is a secure repository and evidence-preservation service. It
            does not replace legal execution of a will: under the South African Wills Act, a
            valid will still requires a wet-ink signature with witnesses.
          </p>
          <p className="text-caption text-fg-muted">
            &copy; {new Date().getFullYear()} Stellr SA. POPIA-compliant by design. Data hosted
            in South Africa.
          </p>
        </div>
      </footer>
    </div>
  );
}
