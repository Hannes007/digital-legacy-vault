import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  /** Helper text shown below the field when there is no error. */
  hint?: string | undefined;
  /** Error message; sets aria-invalid and describes the field. */
  error?: string | undefined;
  leadingIcon?: ReactNode | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leadingIcon, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-body-sm font-medium text-fg">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-muted">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={cn(
            'h-10 w-full rounded-md border bg-surface px-3 text-body text-fg',
            'placeholder:text-fg-muted',
            'transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)]',
            'focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-1 focus:ring-offset-surface',
            'disabled:cursor-not-allowed disabled:opacity-60',
            leadingIcon ? 'pl-10' : '',
            error ? 'border-danger' : 'border-border-strong',
            className,
          )}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-caption text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-caption text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
