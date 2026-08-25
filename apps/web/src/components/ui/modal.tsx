"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  /** Right-aligned footer actions (primary rightmost). */
  footer?: ReactNode | undefined;
  /** Max width: sm 480px, md 640px, lg 800px (design-system.md §5.4). */
  size?: ModalSize | undefined;
  /** Disable Esc/overlay dismissal for uninterruptible steps. */
  disableDismiss?: boolean | undefined;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-[480px]",
  md: "max-w-[640px]",
  lg: "max-w-[800px]",
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "sm",
  disableDismiss = false,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Initial focus: first non-destructive focusable control, else the panel.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const preferred =
        focusables.find((el) => el.dataset["autofocus"] === "true") ??
        focusables.find((el) => !el.dataset["destructive"]) ??
        panel;
      preferred.focus();
    });
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && !disableDismiss) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0] as HTMLElement;
      const last = focusables[focusables.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [disableDismiss, onClose],
  );

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-overlay)] flex items-end justify-center p-4 sm:items-center"
      onKeyDown={handleKeyDown}
    >
      <div
        aria-hidden="true"
        onClick={disableDismiss ? undefined : onClose}
        className="fixed inset-0 bg-[#10182899] backdrop-blur-[4px]"
        style={{ animation: "dlv-fade-in var(--duration-standard) var(--ease-out)" }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-[var(--z-modal)] flex max-h-[85dvh] w-full flex-col rounded-xl bg-raised shadow-lg",
          sizeClasses[size],
        )}
        style={{ animation: "dlv-scale-in var(--duration-standard) var(--ease-out)" }}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="flex flex-col gap-1">
            <h3 id={titleId} className="text-h3 text-fg">
              {title}
            </h3>
            {description ? (
              <p id={descriptionId} className="text-body-sm text-fg-secondary">
                {description}
              </p>
            ) : null}
          </div>
          {!disableDismiss ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-fg-muted",
                "transition-colors duration-[var(--duration-micro)] hover:bg-subtle hover:text-fg",
              )}
            >
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="overflow-y-auto px-6 py-5 text-body text-fg-secondary">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
