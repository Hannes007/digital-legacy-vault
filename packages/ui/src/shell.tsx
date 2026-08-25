import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface AppShellProps {
  /** Desktop sidebar (hidden below md). */
  sidebar?: ReactNode | undefined;
  /** Sticky top bar. */
  topbar?: ReactNode | undefined;
  /** Fixed bottom navigation for small screens. */
  mobileNav?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}

/**
 * Authenticated application shell: desktop sidebar + content column with a
 * sticky topbar, and an optional mobile bottom nav. The design-system §4 layout
 * foundation shared by every signed-in page.
 */
export function AppShell({ sidebar, topbar, mobileNav, children, className }: AppShellProps) {
  return (
    <div className={cn('min-h-dvh md:grid md:grid-cols-[264px_1fr]', className)}>
      {sidebar}
      <div className="flex min-w-0 flex-col">
        {topbar}
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-24 pt-8 sm:px-6 md:pb-12 lg:px-8"
        >
          {children}
        </main>
      </div>
      {mobileNav}
    </div>
  );
}
