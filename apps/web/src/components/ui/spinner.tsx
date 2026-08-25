import { cn } from "@/lib/cn";

export interface SpinnerProps {
  /** Pixel size of the spinner. Default 20. */
  size?: number | undefined;
  className?: string | undefined;
  /**
   * Accessible label. When omitted the spinner is decorative (aria-hidden) —
   * use that form inside elements that already announce busy state.
   */
  label?: string | undefined;
}

export function Spinner({ size = 20, className, label }: SpinnerProps) {
  return (
    <svg
      className={cn("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...(label ? { role: "status", "aria-label": label } : { "aria-hidden": true })}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
