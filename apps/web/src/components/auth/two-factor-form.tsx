"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { safeNextPath } from "@/components/auth/login-form";
import { Alert, Button, Input, Spinner } from "@/components/ui";
import { isApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { totpCodeSchema, validate } from "@/lib/validation";

export function TwoFactorForm() {
  const { mfaChallenge, completeTotp, loginWithPasskey } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  // No challenge means the visitor landed here directly, or the 5-minute
  // mfaToken window lapsed across a reload — either way, back to sign-in.
  useEffect(() => {
    if (!mfaChallenge) {
      router.replace("/login");
    }
  }, [mfaChallenge, router]);

  if (!mfaChallenge) {
    return (
      <div className="flex justify-center py-8">
        <Spinner label="Returning to sign in" />
      </div>
    );
  }

  const supportsPasskey = mfaChallenge.methods.includes("PASSKEY");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    const result = validate(totpCodeSchema, { code });
    if (result.fieldErrors) {
      setFieldError(result.fieldErrors["code"] ?? null);
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      await completeTotp(result.data.code);
      router.push(nextPath);
    } catch (error) {
      if (isApiError(error) && (error.status === 400 || error.status === 401)) {
        setFormError(
          "That code didn't work. Codes expire quickly — enter the newest one from your app, or start signing in again.",
        );
      } else if (isApiError(error) && error.status === 0) {
        setFormError(error.message);
      } else {
        setFormError("Something went wrong on our side. Try again in a moment.");
      }
      setSubmitting(false);
    }
  }

  async function handlePasskey(): Promise<void> {
    setFormError(null);
    setPasskeyBusy(true);
    try {
      await loginWithPasskey();
      router.push(nextPath);
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") {
        setFormError("Passkey verification was cancelled. You can try again, or use a code.");
      } else {
        setFormError("We couldn't verify with a passkey on this device. Use a code instead.");
      }
      setPasskeyBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-fg-secondary">
        Signing in as <strong className="text-fg">{mfaChallenge.email}</strong>. Enter the
        6-digit code from your authenticator app, or one of your recovery codes.
      </p>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1">
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}
        <Input
          label="Verification code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          error={fieldError ?? undefined}
          onChange={(event) => {
            setCode(event.target.value);
            if (fieldError) setFieldError(null);
          }}
        />
        <Button type="submit" loading={submitting} className="mt-1 w-full">
          Verify and sign in
        </Button>
      </form>

      {supportsPasskey ? (
        <>
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-caption text-fg-muted">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            variant="secondary"
            loading={passkeyBusy}
            icon={<KeyRound size={16} strokeWidth={1.5} aria-hidden="true" />}
            onClick={() => void handlePasskey()}
            className="w-full"
          >
            Use a passkey instead
          </Button>
        </>
      ) : null}

      <p className="text-body-sm text-fg-secondary">
        Lost access to your codes?{" "}
        <Link
          href="/login"
          className="rounded-sm font-medium text-accent hover:text-accent-hover"
        >
          Start again
        </Link>{" "}
        and use a recovery code where the app code goes.
      </p>
    </div>
  );
}
