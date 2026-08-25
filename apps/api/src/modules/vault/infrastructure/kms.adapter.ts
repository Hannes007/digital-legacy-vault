import { DecryptCommand, EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
import { Inject, Injectable } from '@nestjs/common';

import { unwrapDekWithKek, wrapDekWithKek } from '@dlv/crypto';

import { ENV } from '../../../common/tokens';
import type { KmsPort } from '../application/ports';
import type { Env } from '@dlv/config';

/**
 * KMS-backed DEK wrapping. When `KMS_DEK_KEY_ID` is set, wraps/unwraps with the
 * CMK; otherwise falls back to a local AES-KEK derived from
 * `FIELD_ENCRYPTION_KEY_B64` so development and tests are self-contained
 * (invariant §7.2 — the plaintext DEK is never persisted either way).
 */
@Injectable()
export class KmsAdapter implements KmsPort {
  private readonly kms?: KMSClient;
  private readonly keyId: string;
  private readonly kek: Uint8Array;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.keyId = env.KMS_DEK_KEY_ID;
    this.kek = new Uint8Array(Buffer.from(env.FIELD_ENCRYPTION_KEY_B64, 'base64'));
    if (this.keyId) this.kms = new KMSClient({ region: env.AWS_REGION });
  }

  async wrapDek(dek: Uint8Array): Promise<string> {
    if (this.kms) {
      const out = await this.kms.send(new EncryptCommand({ KeyId: this.keyId, Plaintext: dek }));
      if (!out.CiphertextBlob) throw new Error('KMS returned no ciphertext.');
      return Buffer.from(out.CiphertextBlob).toString('base64');
    }
    return wrapDekWithKek(this.kek, dek);
  }

  async unwrapDek(wrapped: string): Promise<Uint8Array> {
    if (this.kms) {
      const out = await this.kms.send(
        new DecryptCommand({ KeyId: this.keyId, CiphertextBlob: Buffer.from(wrapped, 'base64') }),
      );
      if (!out.Plaintext) throw new Error('KMS returned no plaintext.');
      return new Uint8Array(out.Plaintext);
    }
    return unwrapDekWithKek(this.kek, wrapped);
  }
}
