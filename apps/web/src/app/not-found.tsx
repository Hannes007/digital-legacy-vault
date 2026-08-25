import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <FileQuestion size={48} strokeWidth={1.5} aria-hidden="true" className="text-fg-muted" />
      <h1 className="text-h1 text-fg">We can&rsquo;t find that page</h1>
      <p className="max-w-[48ch] text-body text-fg-secondary">
        The page may have moved, or the link may be out of date. Nothing in your vault has
        changed.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-body font-medium text-on-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-hover"
      >
        Go to the home page
      </Link>
    </main>
  );
}
