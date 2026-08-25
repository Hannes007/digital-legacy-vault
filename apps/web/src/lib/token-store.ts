/**
 * In-memory access-token store.
 *
 * The access token is deliberately never written to localStorage,
 * sessionStorage, or cookies (XSS containment). It lives only in this
 * module-level variable and is re-obtained via the httpOnly `dlv_rt`
 * refresh cookie on a full page load.
 */
let accessToken: string | null = null;

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  set(token: string): void {
    accessToken = token;
  },
  clear(): void {
    accessToken = null;
  },
};
