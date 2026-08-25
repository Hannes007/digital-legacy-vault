/**
 * Domain error hierarchy. Application/HTTP layers map these to RFC 9457
 * problem+json responses (PROJECT_MEMORY §8); the `code` is the stable,
 * machine-readable discriminator.
 */
export interface DomainErrorOptions {
  cause?: unknown;
  details?: Record<string, unknown>;
}

export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, options?: DomainErrorOptions) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    if (options?.details !== undefined) {
      this.details = options.details;
    }
  }
}

/** Requested resource does not exist. */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}

/** Request conflicts with current state (duplicate, version mismatch). */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}

/** Input failed a domain/business rule. */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION';
}

/** Authenticated principal lacks permission (authz — deny by default, §7.8). */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
}

/** No/invalid authentication. */
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
}
