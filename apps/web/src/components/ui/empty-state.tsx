import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** One sentence of guidance — encouraging, never guilt-inducing. */
  description: string;
  /** Single primary action. */
  action?: ReactNode | undefined;
  /** Optional secondary "learn how" affordance. */
  secondaryAction?: ReactNode | undefined;
  className?: string | undefined;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <Icon size={48} strokeWidth={1.5} aria-hidden="true" className="text-fg-muted" />
      <h3 className="text-h3 text-fg">{title}</h3>
      <p className="max-w-[40ch] text-body-sm text-fg-secondary">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
      {secondaryAction}
    </div>
  );
}
