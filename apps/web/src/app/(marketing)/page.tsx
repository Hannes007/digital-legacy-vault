import {
  BadgeCheck,
  FileCheck,
  History,
  HeartHandshake,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
  UserCheck,
  Users,
  Vault,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Digital Legacy Vault — a secure home for what matters",
  description:
    "Keep your will, policies, and end-of-life wishes safe — and make sure the right people can reach them when it matters.",
};

function FeatureItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 text-accent">
        {icon}
      </span>
      <span className="text-body text-fg-secondary">{children}</span>
    </li>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-16 sm:px-6 md:pt-24 lg:px-8">
        <div className="mx-auto flex max-w-[64ch] flex-col items-center gap-6 text-center">
          <h1 className="text-balance text-h1 text-fg md:text-display">
            A calm, secure home for life&rsquo;s most important documents
          </h1>
          <p className="max-w-[52ch] text-body-lg text-fg-secondary">
            Digital Legacy Vault keeps your will, policies, and end-of-life wishes safe — and
            makes sure the right people can reach them when it matters.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-5 text-body font-medium text-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-hover"
            >
              Create your vault
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border-strong bg-surface px-5 text-body font-medium text-fg transition-colors duration-[var(--duration-micro)] hover:bg-subtle"
            >
              See how it works
            </a>
          </div>
          <p className="text-body-sm text-fg-muted">Free to start. Your data stays yours.</p>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section
        id="features"
        aria-labelledby="features-heading"
        className="border-t border-border bg-surface"
      >
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-16 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[56ch] flex-col gap-3 text-center">
            <h2 id="features-heading" className="text-h2 text-fg md:text-h1">
              Three things, done properly
            </h2>
            <p className="text-body text-fg-secondary">
              We do less than most apps, on purpose. What we do, we do with the care these
              documents deserve.
            </p>
          </div>

          {/* Feature 1 — secure vault */}
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent-subtle">
                <Vault size={24} strokeWidth={1.5} aria-hidden="true" className="text-accent-text" />
              </span>
              <h3 className="text-h3 text-fg">A vault for documents, not just files</h3>
              <p className="max-w-[52ch] text-body text-fg-secondary">
                Wills, title deeds, policies, ID documents — stored once, encrypted always, and
                organised so your family isn&rsquo;t left searching through drawers and inboxes.
              </p>
              <ul className="flex flex-col gap-3">
                <FeatureItem icon={<LockKeyhole size={20} strokeWidth={1.5} />}>
                  Every document is encrypted with AES-256 before it rests, and only travels
                  over encrypted connections.
                </FeatureItem>
                <FeatureItem icon={<FileCheck size={20} strokeWidth={1.5} />}>
                  Every file is virus-scanned and integrity-checked, so what you stored is
                  exactly what your family receives.
                </FeatureItem>
                <FeatureItem icon={<History size={20} strokeWidth={1.5} />}>
                  Every version is kept. Nothing is silently overwritten or lost.
                </FeatureItem>
              </ul>
            </div>
            <div
              aria-hidden="true"
              className="hidden items-center justify-center rounded-xl border border-border bg-subtle p-12 md:flex"
            >
              <Vault size={96} strokeWidth={1} className="text-accent" />
            </div>
          </div>

          {/* Feature 2 — guided estate documents */}
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div
              aria-hidden="true"
              className="order-last hidden items-center justify-center rounded-xl border border-border bg-subtle p-12 md:order-first md:flex"
            >
              <ScrollText size={96} strokeWidth={1} className="text-accent" />
            </div>
            <div className="flex flex-col gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent-subtle">
                <ScrollText
                  size={24}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="text-accent-text"
                />
              </span>
              <h3 className="text-h3 text-fg">Estate documents, without the jargon</h3>
              <p className="max-w-[52ch] text-body text-fg-secondary">
                Step-by-step guidance for wills, living wills, and powers of attorney. Every
                legal term is explained in plain language — an <em>executor</em> is simply the
                person who carries out the wishes in a will.
              </p>
              <ul className="flex flex-col gap-3">
                <FeatureItem icon={<UserCheck size={20} strokeWidth={1.5} />}>
                  Record who you trust — executors, beneficiaries, and the professionals who
                  advise you.
                </FeatureItem>
                <FeatureItem icon={<BadgeCheck size={20} strokeWidth={1.5} />}>
                  We&rsquo;re honest about the law: a will stored here is a secure copy. The
                  original still needs a wet-ink signature with witnesses, and we say so on
                  every screen where it matters.
                </FeatureItem>
              </ul>
            </div>
          </div>

          {/* Feature 3 — audited emergency access */}
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent-subtle">
                <ShieldCheck
                  size={24}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="text-accent-text"
                />
              </span>
              <h3 className="text-h3 text-fg">Emergency access your family can rely on</h3>
              <p className="max-w-[52ch] text-body text-fg-secondary">
                After your death, or in a medical emergency, the people you chose can request
                access. Not before, and never without a record.
              </p>
              <ul className="flex flex-col gap-3">
                <FeatureItem icon={<Users size={20} strokeWidth={1.5} />}>
                  Access requires approval from at least two people you appointed — no single
                  person can open your vault alone.
                </FeatureItem>
                <FeatureItem icon={<History size={20} strokeWidth={1.5} />}>
                  A waiting period you control, and a tamper-evident audit trail of every step,
                  visible to you while you&rsquo;re here to see it.
                </FeatureItem>
                <FeatureItem icon={<HeartHandshake size={20} strokeWidth={1.5} />}>
                  Grieving families see short, quiet screens and a human support contact — not
                  paperwork mazes.
                </FeatureItem>
              </ul>
            </div>
            <div
              aria-hidden="true"
              className="hidden items-center justify-center rounded-xl border border-border bg-subtle p-12 md:flex"
            >
              <ShieldCheck size={96} strokeWidth={1} className="text-accent" />
            </div>
          </div>
        </div>
      </section>

      {/* ---- Compliance strip ---- */}
      <section id="security" aria-labelledby="security-heading" className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
          <h2 id="security-heading" className="text-center text-h2 text-fg">
            Built to a standard, not to a deadline
          </h2>
          <ul className="grid gap-6 sm:grid-cols-3">
            <li className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-6 text-center">
              <ShieldCheck size={24} strokeWidth={1.5} aria-hidden="true" className="text-accent" />
              <span className="text-body font-medium text-fg">POPIA compliant</span>
              <span className="text-body-sm text-fg-secondary">
                Your personal information is processed under South Africa&rsquo;s privacy law,
                with GDPR readiness built in.
              </span>
            </li>
            <li className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-6 text-center">
              <LockKeyhole size={24} strokeWidth={1.5} aria-hidden="true" className="text-accent" />
              <span className="text-body font-medium text-fg">AES-256 encryption</span>
              <span className="text-body-sm text-fg-secondary">
                Encrypted at rest and in transit, with per-document keys and an optional
                client-encrypted vault.
              </span>
            </li>
            <li className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-6 text-center">
              <BadgeCheck size={24} strokeWidth={1.5} aria-hidden="true" className="text-accent" />
              <span className="text-body font-medium text-fg">ISO 27001 alignment</span>
              <span className="text-body-sm text-fg-secondary">
                Security controls, audits, and processes aligned with the international
                standard for information security.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* ---- Closing CTA ---- */}
      <section aria-labelledby="cta-heading" className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-5 px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 id="cta-heading" className="text-h2 text-fg md:text-h1">
            Start with one document
          </h2>
          <p className="max-w-[48ch] text-body text-fg-secondary">
            Most people begin with a single policy or certificate. Your vault will be ready
            when you are.
          </p>
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-5 text-body font-medium text-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-hover"
          >
            Create your vault
          </Link>
        </div>
      </section>
    </>
  );
}
