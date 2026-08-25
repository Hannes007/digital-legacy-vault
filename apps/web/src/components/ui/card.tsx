import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Interactive cards elevate on hover (shadow-sm → shadow-md, 200ms). */
  interactive?: boolean | undefined;
}

export function Card({ interactive, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface shadow-sm",
        interactive &&
          "transition-shadow duration-[var(--duration-standard)] ease-[var(--ease-standard)] hover:shadow-md",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: string;
  description?: string | undefined;
  /** Right-aligned action slot (e.g. a button). */
  action?: ReactNode | undefined;
  className?: string | undefined;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-6 pt-6", className)}>
      <div className="flex flex-col gap-1">
        <h3 className="text-h3 text-fg">{title}</h3>
        {description ? <p className="text-body-sm text-fg-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-6", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-3 border-t border-border px-6 py-4", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
