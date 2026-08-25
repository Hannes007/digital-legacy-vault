import type { HTMLAttributes } from 'react';
import { cn } from './cn.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Elevated surface with shadow instead of a flat bordered card. */
  raised?: boolean | undefined;
}

export function Card({ raised = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface',
        raised ? 'shadow-[var(--shadow-md)]' : '',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-b border-border px-5 py-4', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-t border-border px-5 py-4', className)} {...rest}>
      {children}
    </div>
  );
}
