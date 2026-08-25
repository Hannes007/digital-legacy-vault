import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn.js';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant | undefined;
  title?: string | undefined;
  icon?: ReactNode | undefined;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'border-accent/30 bg-accent-subtle text-accent-text',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
};

export function Alert({ variant = 'info', title, icon, className, children, ...rest }: AlertProps) {
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md border px-4 py-3', variantClasses[variant], className)}
      {...rest}
    >
      {icon ? <span aria-hidden="true" className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="flex flex-col gap-0.5">
        {title ? <p className="text-body-sm font-semibold">{title}</p> : null}
        {children ? <div className="text-body-sm">{children}</div> : null}
      </div>
    </div>
  );
}
