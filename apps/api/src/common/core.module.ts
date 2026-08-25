import { createAesGcmFieldCipher, type FieldCipher } from '@dlv/crypto';
import { Global, Module } from '@nestjs/common';

import { SystemClock } from './time/clock';
import { CLOCK, ENV, FIELD_CIPHER } from './tokens';

import type { Env } from '@dlv/config';


/**
 * Global providers with no business logic: the wall clock and the process-wide
 * field cipher. Kept separate from ConfigModule so tests can import config
 * alone, and separate from feature modules so any context can inject them.
 */
@Global()
@Module({
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: FIELD_CIPHER,
      useFactory: (env: Env): FieldCipher =>
        createAesGcmFieldCipher(Buffer.from(env.FIELD_ENCRYPTION_KEY_B64, 'base64')),
      inject: [ENV],
    },
  ],
  exports: [CLOCK, FIELD_CIPHER],
})
export class CoreModule {}
