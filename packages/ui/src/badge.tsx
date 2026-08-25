import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn.js';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'seal';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant | undefined;
  icon?: ReactNode | undefined;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-subtle text-fg-secondary',
  accent: 'bg-accent-subtle text-accent-text',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  seal: 'bg-seal/10 text-seal',
};

export function Badge({ variant = 'neutral', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium',
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
