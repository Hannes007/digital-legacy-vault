"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Alert, Button, Input } from "@/components/ui";
import { apiClient, isApiError } from "@/lib/api-client";
import { registerSchema, validate } from "@/lib/validation";

type FieldName = "firstName" | "lastName" | "email" | "password";

const emptyValues: Record<FieldName, string> = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

export function RegisterForm() {
  const [values, setValues] = useState(emptyValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  function setField(name: FieldName, value: string): void {
    setValues((prev) => ({ ...prev, [name]: value }));
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
    const result = validate(registerSchema, values);
    if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await apiClient.register(result.data);
      setRegisteredEmail(result.data.email);
    } catch (error) {
      if (isApiError(error)) {
        const serverFieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (messages[0]) serverFieldErrors[field] = messages[0];
        }
        if (Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(serverFieldErrors);
        } else if (error.status === 429) {
          setFormError("Too many sign-up attempts. Wait a moment, then try again.");
        } else if (error.status === 0) {
          setFormError(error.message);
        } else {
          setFormError("We couldn't create your account right now. Try again in a moment.");
        }
      } else {
        setFormError("We couldn't create your account right now. Try again in a moment.");
      }
      setSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck size={48} strokeWidth={1.5} aria-hidden="true" className="text-success" />
          <h2 className="text-h3 text-fg">Check your email</h2>
          <p className="max-w-[40ch] text-body-sm text-fg-secondary">
            We&rsquo;ve sent a confirmation link to <strong className="text-fg">{registeredEmail}</strong>.
            Open it to verify your address, then sign in.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body font-medium text-fg transition-colors duration-[var(--duration-micro)] hover:bg-subtle"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1">
      {formError ? (
        <Alert variant="danger" className="mb-3">
          {formError}
        </Alert>
      ) : null}
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Input
          label="First name"
          name="firstName"
          autoComplete="given-name"
          value={values.firstName}
          error={fieldErrors["firstName"]}
          onChange={(event) => setField("firstName", event.target.value)}
        />
        <Input
          label="Last name"
          name="lastName"
          autoComplete="family-name"
          value={values.lastName}
          error={fieldErrors["lastName"]}
          onChange={(event) => setField("lastName", event.target.value)}
        />
      </div>
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
        autoComplete="new-password"
        description="At least 12 characters — a short phrase you'll remember works well."
        value={values.password}
        error={fieldErrors["password"]}
        onChange={(event) => setField("password", event.target.value)}
      />
      <Button type="submit" loading={submitting} className="mt-1 w-full">
        Create your vault
      </Button>
      <p className="mt-3 text-caption text-fg-muted">
        By continuing you agree that your personal information is processed under POPIA, and
        encrypted before it is stored.
      </p>
    </form>
  );
}
