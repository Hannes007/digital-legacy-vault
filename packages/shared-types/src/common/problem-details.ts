/**
 * RFC 9457 `application/problem+json` error body returned by every DLV API error
 * response (PROJECT_MEMORY §8; phase-2-contracts).
 *
 * Responses must never leak stack traces, SQL or internal identifiers; 5xx bodies
 * stay generic and diagnostic detail travels via logs keyed by trace id.
 */
export interface ProblemDetails {
  /** URI reference identifying the problem type (stable and documented). */
  type: string;
  /** Short, human-readable summary of the problem type. */
  title: string;
  /** HTTP status code for this occurrence. */
  status: number;
  /** Human-readable explanation specific to this occurrence. */
  detail?: string;
  /** URI reference identifying this specific occurrence (typically the request path). */
  instance?: string;
  /** Field-level validation errors keyed by property path. */
  errors?: Record<string, string[]>;
}
