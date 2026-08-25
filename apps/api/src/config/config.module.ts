import { loadEnv, type Env } from '@dlv/config';
import { Global, Module } from '@nestjs/common';

import { ENV } from '../common/tokens';

/**
 * Global configuration module.
 *
 * Loads and validates the environment ONCE at boot via `@dlv/config.loadEnv`,
 * which throws a single aggregated, secret-safe error if anything is missing or
 * malformed (fail fast, never boot half-configured). The resulting frozen
 * {@link Env} is exposed under the {@link ENV} token to the whole app.
 */
@Global()
@Module({
  providers: [
    {
      provide: ENV,
      useFactory: (): Env => loadEnv(),
    },
  ],
  exports: [ENV],
})
export class ConfigModule {}
