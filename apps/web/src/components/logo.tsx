import { cn } from "@/lib/cn";

export interface LogoProps {
  className?: string | undefined;
  /** Hide the wordmark and render the mark only. */
  markOnly?: boolean | undefined;
}

export function Logo({ className, markOnly }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 512 512"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="512" height="512" rx="112" className="fill-accent" />
        <path
          d="M256 96c-53 0-96 43-96 96v32h48v-32c0-26.5 21.5-48 48-48s48 21.5 48 48v32h48v-32c0-53-43-96-96-96z"
          fill="#ffffff"
        />
        <rect x="136" y="224" width="240" height="176" rx="28" fill="#ffffff" />
        <circle cx="256" cy="292" r="26" className="fill-accent" />
        <rect x="244" y="300" width="24" height="52" rx="12" className="fill-accent" />
      </svg>
      {!markOnly ? (
        <span className="text-body font-semibold tracking-tight text-fg">
          Digital Legacy Vault
        </span>
      ) : null}
    </span>
  );
}
