import "@fontsource-variable/inter";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "@/lib/auth-context";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL(process.env["NEXT_PUBLIC_WEB_URL"] ?? "http://localhost:3000"),
  title: {
    default: "Digital Legacy Vault — a secure home for what matters",
    template: "%s — Digital Legacy Vault",
  },
  description:
    "Keep your will, policies, and end-of-life wishes safe — and make sure the right people can reach them when it matters.",
  applicationName: "Digital Legacy Vault",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Legacy Vault",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1116" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning>
      <head>
        {/* Theme no-flash: applies the persisted/system theme before paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:text-body focus:font-medium focus:text-fg focus:shadow-lg"
        >
          Skip to main content
        </a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
