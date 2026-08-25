import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailStatus } from "@/components/auth/verify-email-status";
import { Card, CardBody, Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Verify your email",
};

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardBody className="flex flex-col gap-6">
        <h1 className="text-h2 text-fg">Verify your email</h1>
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Spinner label="Checking your verification link" />
            </div>
          }
        >
          <VerifyEmailStatus />
        </Suspense>
      </CardBody>
    </Card>
  );
}
