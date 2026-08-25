import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface EmptyStateProps {
  icon?: ReactNode | undefined;
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      {icon ? <div className="text-fg-muted" aria-hidden="true">{icon}</div> : null}
      <h3 className="text-h4 font-semibold text-fg">{title}</h3>
      {description ? <p className="max-w-sm text-body-sm text-fg-secondary">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
