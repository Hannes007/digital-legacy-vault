"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { applyTheme, getCurrentTheme, type Theme } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string | undefined }) {
  // Theme is resolved after mount to stay consistent with the inline
  // no-flash script; until then render a neutral (light) toggle.
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getCurrentTheme());
    setMounted(true);
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={mounted ? `Switch to ${next} mode` : "Switch colour theme"}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-md text-fg-secondary",
        "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)]",
        "hover:bg-subtle hover:text-fg",
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun size={20} strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <Moon size={20} strokeWidth={1.5} aria-hidden="true" />
      )}
    </button>
  );
}
