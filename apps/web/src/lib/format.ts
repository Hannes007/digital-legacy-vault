const dateTimeFormatter = new Intl.DateTimeFormat("en-ZA", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Formats an ISO 8601 timestamp as `05 Jul 2026, 14:02` (en-ZA). */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** Formats an ISO 8601 timestamp as `05 Jul 2026` (en-ZA). */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
