"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Feather,
  FileSignature,
  PenLine,
  ScrollText,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Alert, Badge, Card, CardBody, CardHeader } from "@/components/ui";

/**
 * Wills wet-ink guidance (Phase 5). A dedicated, plain-language flow that helps
 * a testator execute a valid will under the South African Wills Act 7 of 1953.
 * DLV preserves *evidence* — it does not replace the wet-ink execution the Act
 * requires. Not legal advice; encourages professional review.
 */

interface Requirement {
  id: string;
  icon: typeof PenLine;
  title: string;
  detail: string;
}

const REQUIREMENTS: Requirement[] = [
  {
    id: "writing",
    icon: ScrollText,
    title: "Put the will in writing",
    detail:
      "The will must be a written document (typed or handwritten). A purely electronic or video will is not valid under the Wills Act.",
  },
  {
    id: "sign-end",
    icon: PenLine,
    title: "Sign at the very end",
    detail:
      "You (the testator) sign at the end of the will. If you cannot sign, someone may sign on your behalf in your presence and at your direction, before a commissioner of oaths.",
  },
  {
    id: "sign-pages",
    icon: PenLine,
    title: "Sign every page",
    detail: "Sign each page of the will (anywhere on the page) so no page can be substituted later.",
  },
  {
    id: "witnesses",
    icon: Users,
    title: "Two competent witnesses, present together",
    detail:
      "Two or more competent witnesses (14 years or older and able to give evidence in court) must be present at the same time when you sign or acknowledge your signature.",
  },
  {
    id: "witnesses-sign",
    icon: Users,
    title: "Witnesses sign in your presence",
    detail:
      "Each witness signs the will in your presence (and, in practice, in the presence of each other). Witnesses sign the last page.",
  },
  {
    id: "no-beneficiary-witness",
    icon: AlertTriangle,
    title: "Beneficiaries must not witness",
    detail:
      "A person who witnesses the will — or their spouse — is generally disqualified from inheriting under it (s4A). Never use a beneficiary or their spouse as a witness.",
  },
  {
    id: "date",
    icon: CheckCircle2,
    title: "Date the will",
    detail:
      "Date the will clearly. A later validly-executed will revokes an earlier one, so the date matters.",
  },
];

export default function WillsPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const completed = useMemo(() => REQUIREMENTS.filter((r) => checked[r.id]).length, [checked]);
  const allDone = completed === REQUIREMENTS.length;

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-accent-subtle p-2 text-accent-text">
          <Feather size={22} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-h2 font-semibold text-fg">Executing your will</h1>
          <p className="text-body text-fg-secondary">
            A valid South African will still requires wet-ink signatures and witnesses. This guide
            walks you through the formalities, then helps you preserve the executed original in your
            vault as tamper-evident proof.
          </p>
        </div>
      </div>

      <Alert variant="warning" title="Wills can't be signed electronically">
        Under the Wills Act 7 of 1953, a will must be signed by hand in the physical presence of two
        competent witnesses. DLV’s electronic signatures are ideal for mandates and directives, but a
        will you sign electronically will not be valid. Use this flow to execute it correctly on
        paper, then store the signed original here.
      </Alert>

      <Card>
        <CardHeader
          title="Execution checklist"
          action={
            <Badge variant={allDone ? "success" : "neutral"}>
              {completed} / {REQUIREMENTS.length} done
            </Badge>
          }
        />
        <CardBody className="flex flex-col gap-3">
          {REQUIREMENTS.map((r) => {
            const Icon = r.icon;
            const isChecked = Boolean(checked[r.id]);
            return (
              <label
                key={r.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4 hover:bg-subtle"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(r.id)}
                  className="mt-1 h-4 w-4"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-body font-medium text-fg">
                    <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                    {r.title}
                  </span>
                  <span className="text-body-sm text-fg-secondary">{r.detail}</span>
                </span>
              </label>
            );
          })}
        </CardBody>
      </Card>

      {allDone ? (
        <Alert variant="success" title="Your will is ready to preserve">
          Once signed and witnessed on paper, store the executed original in your vault so its
          existence, integrity, and date are provable later.
        </Alert>
      ) : null}

      <Card>
        <CardHeader title="Preserve the executed will" />
        <CardBody className="flex flex-col gap-4">
          <p className="text-body-sm text-fg-secondary">
            After the wet-ink signing, scan the signed will and upload it. You can then create a
            signature-evidence record that seals its hash with a trusted timestamp — proof of what the
            document contained and when, without changing how it was executed.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/vault"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-body font-medium text-on-accent hover:bg-accent-hover"
            >
              <Upload size={16} aria-hidden="true" />
              Upload the signed will
            </Link>
            <Link
              href="/signatures"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-4 text-body font-medium text-fg hover:bg-subtle"
            >
              <FileSignature size={16} aria-hidden="true" />
              Create signature evidence
            </Link>
          </div>
          <p className="flex items-center gap-2 text-body-sm text-fg-muted">
            <ShieldCheck size={16} aria-hidden="true" />
            DLV timestamps and hash-seals the file; it never alters your document.
          </p>
        </CardBody>
      </Card>

      <p className="text-body-sm text-fg-muted">
        This guidance is general information, not legal advice. Wills are easy to get wrong — consider
        having yours drafted or reviewed by an admitted attorney or your bank’s fiduciary services.
      </p>
    </div>
  );
}
