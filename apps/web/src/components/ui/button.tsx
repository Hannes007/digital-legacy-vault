"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /**
   * Shows a spinner in the leading-icon slot after a 200ms debounce
   * (design-system.md §5.1), locks the width to prevent layout shift, and
   * sets aria-busy. The label persists.
   */
  loading?: boolean | undefined;
  /** Leading Lucide icon (16px). Replaced by the spinner while loading. */
  icon?: ReactNode | undefined;
  trailingIcon?: ReactNode | undefined;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-border-strong bg-surface text-fg hover:bg-subtle",
  ghost: "bg-transparent text-fg-secondary hover:bg-subtle hover:text-fg",
  danger: "bg-danger text-on-accent hover:brightness-[0.92]",
  "danger-outline": "border border-danger bg-transparent text-danger hover:bg-danger/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-body-sm",
  md: "h-10 px-4 text-body",
  lg: "h-12 px-5 text-body",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    trailingIcon,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  forwardedRef,
) {
  const innerRef = useRef<HTMLButtonElement | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const [lockedWidth, setLockedWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      setLockedWidth(null);
      return;
    }
    if (innerRef.current) {
      setLockedWidth(innerRef.current.offsetWidth);
    }
    const timer = window.setTimeout(() => setShowSpinner(true), 200);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return (
    <button
      ref={(node) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      style={lockedWidth !== null ? { width: `${lockedWidth}px` } : undefined}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-md font-medium",
        "transition-[background-color,border-color,color,filter,transform] duration-[var(--duration-micro)] ease-[var(--ease-standard)]",
        "active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {showSpinner ? <Spinner size={16} /> : icon}
      {children}
      {trailingIcon}
    </button>
  );
});
