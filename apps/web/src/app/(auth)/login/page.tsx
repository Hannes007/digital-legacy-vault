import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardBody, Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Card>
      <CardBody className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 text-fg">Sign in</h1>
          <p className="text-body-sm text-fg-secondary">
            Welcome back. Your vault is where you left it.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Spinner label="Loading the sign-in form" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
        <p className="text-body-sm text-fg-secondary">
          New here?{" "}
          <Link
            href="/register"
            className="rounded-sm font-medium text-accent hover:text-accent-hover"
          >
            Create your vault
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
