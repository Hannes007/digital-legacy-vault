import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardBody } from "@/components/ui";

export const metadata: Metadata = {
  title: "Create your vault",
};

export default function RegisterPage() {
  return (
    <Card>
      <CardBody className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 text-fg">Create your vault</h1>
          <p className="text-body-sm text-fg-secondary">
            A few details, and your encrypted vault is ready.
          </p>
        </div>
        <RegisterForm />
        <p className="text-body-sm text-fg-secondary">
          Already have a vault?{" "}
          <Link
            href="/login"
            className="rounded-sm font-medium text-accent hover:text-accent-hover"
          >
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
