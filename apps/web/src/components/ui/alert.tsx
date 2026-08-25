import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type AlertVariant = "info" | "success" | "warning" | "danger";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant | undefined;
  title?: string | undefined;
  children?: ReactNode | undefined;
}

/* Colour never carries meaning alone (WCAG 1.4.1): each variant pairs an
 * icon with the tinted container, and titles/body remain plain text. */
const variantConfig: Record<
  AlertVariant,
  { icon: typeof Info; container: string; iconColor: string; role: "status" | "alert" }
> = {
  info: {
    icon: Info,
    container: "border-accent/40 bg-accent-subtle text-fg",
    iconColor: "text-accent-text",
    role: "status",
  },
  success: {
    icon: CircleCheck,
    container: "border-success/40 bg-success/10 text-fg",
    iconColor: "text-success",
    role: "status",
  },
  warning: {
    icon: TriangleAlert,
    container: "border-warning/40 bg-warning/10 text-fg",
    iconColor: "text-warning",
    role: "alert",
  },
  danger: {
    icon: CircleAlert,
    container: "border-danger/40 bg-danger/10 text-fg",
    iconColor: "text-danger",
    role: "alert",
  },
};

export function Alert({ variant = "info", title, children, className, ...rest }: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  return (
    <div
      role={config.role}
      className={cn("flex gap-3 rounded-lg border px-4 py-3", config.container, className)}
      {...rest}
    >
      <Icon
        size={20}
        strokeWidth={1.5}
        aria-hidden="true"
        className={cn("mt-0.5 shrink-0", config.iconColor)}
      />
      <div className="flex flex-col gap-1 text-body-sm">
        {title ? <p className="font-medium text-fg">{title}</p> : null}
        {children ? <div className="text-fg-secondary">{children}</div> : null}
      </div>
    </div>
  );
}
