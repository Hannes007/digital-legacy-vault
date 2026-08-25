/**
 * One active login session, as listed by `GET /api/v1/users/me/sessions`.
 *
 * IP addresses are masked before they reach any client (privacy by design;
 * no full IPs in API responses).
 */
export interface SessionDto {
  /** UUIDv7 session identifier (matches the `sid` JWT claim). */
  id: string;
  /** Human-friendly device description derived from the user agent (e.g. `Chrome on Windows`). */
  deviceLabel: string;
  /** Masked source IP (e.g. `102.65.x.x`). */
  ipMasked: string;
  /** Last activity time, ISO 8601 UTC. */
  lastSeenAt: string;
  /** Session creation time, ISO 8601 UTC. */
  createdAt: string;
  /** True when this session issued the access token used for the current request. */
  current: boolean;
}
