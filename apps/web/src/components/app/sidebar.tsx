"use client";

import {
  Bell,
  Building2,
  CreditCard,
  Sparkles,
  Feather,
  FileSignature,
  House,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Vault,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  comingSoon?: boolean;
}

const primaryItems: NavItem[] = [
  { label: "Dashboard", icon: House, href: "/dashboard" },
  { label: "Vault", icon: Vault, href: "/vault" },
  { label: "Signatures", icon: FileSignature, href: "/signatures" },
  { label: "Wills", icon: Feather, href: "/wills" },
  { label: "Legacy", icon: ScrollText, href: "/legacy" },
  { label: "Assistant", icon: Sparkles, href: "/assistant" },
  { label: "Organisation", icon: Building2, href: "/organisation" },
  { label: "Sharing", icon: Users, comingSoon: true },
];

const secondaryItems: NavItem[] = [
  { label: "Plans & billing", icon: CreditCard, href: "/billing" },
  { label: "Notifications", icon: Bell, href: "/settings/notifications" },
  { label: "Privacy & data", icon: ShieldCheck, href: "/privacy" },
  { label: "AI & your data", icon: Sparkles, href: "/settings/ai" },
  { label: "Settings", icon: Settings, href: "/settings/security" },
];

function isActive(pathname: string, href: string): boolean {
  const section = `/${href.split("/")[1] ?? ""}`;
  return pathname === section || pathname.startsWith(`${section}/`);
}

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;

  if (item.comingSoon || !item.href) {
    return (
      <li>
        <span
          aria-disabled="true"
          className="flex h-11 items-center gap-3 rounded-md px-3 text-body text-fg-muted"
        >
          <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
          <span className="flex-1">{item.label}</span>
          <Badge>Coming soon</Badge>
        </span>
      </li>
    );
  }

  const active = isActive(pathname, item.href);
  return (
    <li className="relative">
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent"
        />
      ) : null}
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-11 items-center gap-3 rounded-md px-3 text-body font-medium",
          "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)]",
          active
            ? "bg-accent-subtle text-accent-text"
            : "text-fg-secondary hover:bg-subtle hover:text-fg",
        )}
      >
        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
        {item.label}
      </Link>
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-border bg-surface md:flex md:flex-col">
      <div className="sticky top-0 flex h-dvh flex-col gap-6 px-4 py-6">
        <Link href="/dashboard" aria-label="Digital Legacy Vault — dashboard" className="rounded-md px-1">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="flex flex-1 flex-col justify-between">
          <ul className="flex flex-col gap-1">
            {primaryItems.map((item) => (
              <SidebarItem key={item.label} item={item} pathname={pathname} />
            ))}
          </ul>
          <ul className="flex flex-col gap-1 border-t border-border pt-4">
            {secondaryItems.map((item) => (
              <SidebarItem key={item.label} item={item} pathname={pathname} />
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
