"use client";

import { CircleCheck, MailQuestion } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Alert, Spinner } from "@/components/ui";
import { apiClient } from "@/lib/api-client";

type Status = "missing-token" | "verifying" | "verified" | "failed";

export function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "missing-token");
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    let cancelled = false;
    apiClient
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus("verified");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "missing-token") {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <MailQuestion size={48} strokeWidth={1.5} aria-hidden="true" className="text-fg-muted" />
        <p className="max-w-[40ch] text-body-sm text-fg-secondary">
          This page confirms your email address. Open the link in the email we sent you — the
          full link contains a verification code.
        </p>
        <Link
          href="/login"
          className="rounded-sm text-body-sm font-medium text-accent hover:text-accent-hover"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
        <Spinner size={32} label="Verifying your email address" />
        <p className="text-body-sm text-fg-secondary">Verifying your email address…</p>
      </div>
    );
  }

  if (status === "verified") {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <CircleCheck size={48} strokeWidth={1.5} aria-hidden="true" className="text-success" />
        <p className="max-w-[40ch] text-body-sm text-fg-secondary">
          Your email address is verified. You can sign in to your vault now.
        </p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-body font-medium text-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-hover"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="danger" title="We couldn't verify that link">
        The link may have expired, or it may already have been used. Sign in to request a new
        verification email.
      </Alert>
      <Link
        href="/login"
        className="rounded-sm text-body-sm font-medium text-accent hover:text-accent-hover"
      >
        Go to sign in
      </Link>
    </div>
  );
}
