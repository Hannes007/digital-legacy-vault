import type { Metadata } from "next";
import { Suspense } from "react";

import { TwoFactorForm } from "@/components/auth/two-factor-form";
import { Card, CardBody, Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Two-factor verification",
};

export default function TwoFactorPage() {
  return (
    <Card>
      <CardBody className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 text-fg">Confirm it&rsquo;s you</h1>
          <p className="text-body-sm text-fg-secondary">
            One more step keeps your vault safe.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Spinner label="Loading verification" />
            </div>
          }
        >
          <TwoFactorForm />
        </Suspense>
      </CardBody>
    </Card>
  );
}
