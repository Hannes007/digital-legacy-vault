/**
 * Lightweight, non-sensitive cookie flag consumed by middleware.ts to route
 * unauthenticated visitors away from (app) pages. It carries no credentials;
 * real enforcement is API-side via the bearer token + `dlv_rt` cookie.
 */
const AUTH_COOKIE = "dlv_auth";
const ONE_MONTH_SECONDS = 2_592_000;

export function setAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=1; Path=/; Max-Age=${ONE_MONTH_SECONDS}; SameSite=Lax`;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").includes(`${AUTH_COOKIE}=1`);
}
