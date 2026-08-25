"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "children"> {
  id?: string | undefined;
  /** Always-visible label (design-system.md §5.2 — no placeholder-as-label). */
  label: string;
  description?: string | undefined;
  /** Plain-language error. Announced via aria-describedby; sets aria-invalid. */
  error?: string | undefined;
  containerClassName?: string | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, description, error, type = "text", className, containerClassName, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <label htmlFor={inputId} className="text-body-sm font-medium text-fg">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-body-sm text-fg-muted">
          {description}
        </p>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-10 w-full rounded-md border bg-surface px-3 text-body text-fg",
            "placeholder:text-fg-muted",
            "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)]",
            "read-only:bg-subtle disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-danger"
              : "border-border-strong hover:border-fg-muted focus:border-accent",
            isPassword && "pr-11",
            className,
          )}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className={cn(
              "absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-sm",
              "text-fg-muted hover:bg-subtle hover:text-fg",
              "transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)]",
            )}
          >
            {revealed ? (
              <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
      {/* Space is reserved so an appearing error doesn't shift the layout. */}
      <p id={errorId} className="min-h-5 text-body-sm text-danger">
        {error}
      </p>
    </div>
  );
});
