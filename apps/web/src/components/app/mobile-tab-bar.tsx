"use client";

import { House, ScrollText, Settings, Users, Vault, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

interface TabItem {
  label: string;
  icon: LucideIcon;
  href: string;
  comingSoon?: boolean;
}

const tabs: TabItem[] = [
  { label: "Home", icon: House, href: "/dashboard" },
  { label: "Vault", icon: Vault, href: "/dashboard", comingSoon: true },
  { label: "Estate", icon: ScrollText, href: "/dashboard", comingSoon: true },
  { label: "Sharing", icon: Users, href: "/dashboard", comingSoon: true },
  { label: "Settings", icon: Settings, href: "/settings/security" },
];

function isActive(pathname: string, href: string): boolean {
  const section = `/${href.split("/")[1] ?? ""}`;
  return pathname === section || pathname.startsWith(`${section}/`);
}

/**
 * Bottom tab bar for small screens (the sidebar is desktop-only). Fixed to the
 * viewport bottom with safe-area padding for iOS PWA installs.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = !tab.comingSoon && isActive(pathname, tab.href);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            aria-disabled={tab.comingSoon ? "true" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-caption font-medium",
              "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)]",
              active ? "text-accent-text" : "text-fg-muted",
              tab.comingSoon ? "pointer-events-none opacity-60" : "hover:text-fg",
            )}
          >
            <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
