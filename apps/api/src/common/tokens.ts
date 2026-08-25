/**
 * Dependency-injection tokens for cross-cutting infrastructure providers.
 *
 * Symbols (not strings) so they can never accidentally collide with a class
 * name or another token, and so the container fails loudly if a provider is
 * missing rather than silently resolving `undefined`.
 */

/** Validated {@link import('@dlv/config').Env} instance (see ConfigModule). */
export const ENV = Symbol('ENV');

/** {@link import('./time/clock').Clock} — the single source of "now". */
export const CLOCK = Symbol('CLOCK');

/**
 * {@link import('@dlv/crypto').FieldCipher} bound to the process
 * field-encryption key (PROJECT_MEMORY §7.3).
 */
export const FIELD_CIPHER = Symbol('FIELD_CIPHER');
