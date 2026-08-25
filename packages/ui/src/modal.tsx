'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn.js';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string | undefined;
  size?: ModalSize | undefined;
  children?: ReactNode | undefined;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ open, onClose, title, size = 'md', children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-overlay, #10182899)' }}
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'w-full overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-lg)]',
          sizeClasses[size],
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-h4 font-semibold text-fg">{title}</h2>
          </div>
        ) : null}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
