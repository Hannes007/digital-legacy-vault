/**
 * @dlv/config — Zod-validated environment loading for Digital Legacy Vault
 * (phase-2-contracts §@dlv/config).
 *
 * `loadEnv` throws ONE aggregated, secret-safe error listing every invalid or
 * missing variable; `renderEnvExample` keeps `.env.example` in lockstep with
 * the schema.
 */

export { envSchema, loadEnv, renderEnvExample, EnvValidationError } from './env.js';
export type { Env } from './env.js';
