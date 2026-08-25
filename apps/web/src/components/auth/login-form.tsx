"use client";

import { KeyRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, Button, Input } from "@/components/ui";
import { isApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { loginSchema, validate } from "@/lib/validation";

/** Only same-origin paths are accepted as a post-login destination. */
export function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

/**
 * Sign-in errors stay deliberately generic — the API returns identical
 * errors for unknown email vs wrong password, and so do we (no enumeration).
 */
function loginErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 401 || error.status === 400) {
      return "That email and password don't match — check them and try again.";
    }
    if (error.status === 429) {
      return "Too many attempts. Wait a moment, then try again.";
    }
    if (error.status === 0) {
      return error.message;
    }
  }
  return "Something went wrong on our side. Try again in a moment.";
}

export function LoginForm() {
  const { login, loginWithPasskey } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  function setField(name: "email" | "password", value: string): void {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Revalidate on change after a first error (design-system.md §5.2).
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    const result = validate(loginSchema, values);
    if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const outcome = await login(result.data.email, result.data.password);
      if (outcome.status === "MFA_REQUIRED") {
        router.push(`/login/two-factor?next=${encodeURIComponent(nextPath)}`);
      } else {
        router.push(nextPath);
      }
    } catch (error) {
      setFormError(loginErrorMessage(error));
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
        setFormError("Passkey sign-in was cancelled. You can try again, or use your password.");
      } else if (isApiError(error)) {
        setFormError(loginErrorMessage(error));
      } else {
        setFormError(
          "We couldn't complete the passkey sign-in on this device. Use your password instead.",
        );
      }
      setPasskeyBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1">
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          error={fieldErrors["email"]}
          onChange={(event) => setField("email", event.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={fieldErrors["password"]}
          onChange={(event) => setField("password", event.target.value)}
        />
        <Button type="submit" loading={submitting} className="mt-1 w-full">
          Sign in
        </Button>
      </form>

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
        Sign in with a passkey
      </Button>
    </div>
  );
}
