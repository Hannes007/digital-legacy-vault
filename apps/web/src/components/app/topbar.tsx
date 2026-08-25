"use client";

import { LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import type { UserDto } from "@dlv/shared-types";

function initials(user: UserDto): string {
  const a = user.firstName?.[0] ?? "";
  const b = user.lastName?.[0] ?? "";
  return (a + b || user.email[0] || "?").toUpperCase();
}

/**
 * Authenticated top bar: mobile logo (the sidebar is hidden < md), theme
 * toggle, and an account menu with sign-out. Closes on outside click / Escape.
 */
export function Topbar({ user }: { user: UserDto }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="md:hidden">
        <Logo />
      </div>
      <div className="flex-1" />
      <ThemeToggle />
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "flex h-10 items-center gap-2 rounded-md px-2 text-body font-medium text-fg-secondary",
            "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)]",
            "hover:bg-subtle hover:text-fg",
          )}
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-body-sm font-semibold text-accent-text"
          >
            {initials(user)}
          </span>
          <span className="hidden max-w-[12rem] truncate sm:inline">
            {user.firstName} {user.lastName}
          </span>
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-body font-medium text-fg">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-body-sm text-fg-secondary">{user.email}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-3 text-body text-fg-secondary",
                "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)]",
                "hover:bg-subtle hover:text-fg",
              )}
            >
              <LogOut size={18} strokeWidth={1.5} aria-hidden="true" />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
