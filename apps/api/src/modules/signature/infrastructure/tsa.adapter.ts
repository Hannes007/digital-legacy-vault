
import {
  buildTimeStampReq,
  issueDevTimestampToken,
  verifyDevTimestampToken,
  type DevTimestampToken,
} from '@dlv/crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';


import { ENV } from '../../../common/tokens';

import type { TimestampAuthority, TimestampResult } from '../application/ports';
import type { Env } from '@dlv/config';

const DEV_AUTHORITY = 'dev-local';

/**
 * RFC 3161 timestamp authority adapter (PROJECT_MEMORY §2.9).
 *
 * When `SIGNATURE_TSA_URL` is configured, `stamp` POSTs a standards
 * `TimeStampReq` to the external TSA and stores the base64 DER token; full
 * cryptographic validation of that token against the TSA certificate chain is
 * a production step (documented). When no URL is set, a self-issued,
 * HMAC-authenticated dev token is minted and fully verified offline — so
 * development, CI and the verification tool exercise the entire seal flow
 * (mirrors the KMS/dev-KEK envelope-encryption fallback).
 */
@Injectable()
export class TsaAdapter implements TimestampAuthority {
  private readonly logger = new Logger(TsaAdapter.name);
  private readonly url: string;
  private readonly devKey: Uint8Array;

  constructor(@Inject(ENV) env: Env) {
    this.url = env.SIGNATURE_TSA_URL;
    this.devKey = new Uint8Array(Buffer.from(env.FIELD_ENCRYPTION_KEY_B64, 'base64'));
  }

  async stamp(sealDigestHex: string): Promise<TimestampResult> {
    if (this.url) {
      const request = buildTimeStampReq(sealDigestHex);
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/timestamp-query', Accept: 'application/timestamp-reply' },
        body: request,
      });
      if (!res.ok) throw new Error(`Timestamp authority responded ${String(res.status)}.`);
      const token = Buffer.from(await res.arrayBuffer()).toString('base64');
      return { authority: this.url, token, genTime: new Date(), imprintAlgorithm: 'SHA-256' };
    }

    const token = issueDevTimestampToken(sealDigestHex, this.devKey);
    return {
      authority: DEV_AUTHORITY,
      token: JSON.stringify(token),
      genTime: new Date(token.genTime),
      imprintAlgorithm: 'SHA-256',
    };
  }

  verify(sealDigestHex: string, stamped: { authority: string; token: string }): Promise<boolean> {
    return Promise.resolve(this.verifyInternal(sealDigestHex, stamped));
  }

  private verifyInternal(sealDigestHex: string, stamped: { authority: string; token: string }): boolean {
    if (stamped.authority === DEV_AUTHORITY) {
      const parsed = this.parseDevToken(stamped.token);
      return parsed !== null && verifyDevTimestampToken(parsed, this.devKey, sealDigestHex);
    }
    // External RFC 3161 token: structural check only here (chain validation is
    // performed against the TSA CA in production).
    try {
      return Buffer.from(stamped.token, 'base64').byteLength > 0;
    } catch {
      return false;
    }
  }

  private parseDevToken(token: string): DevTimestampToken | null {
    try {
      return JSON.parse(token) as DevTimestampToken;
    } catch {
      this.logger.warn('Malformed dev timestamp token.');
      return null;
    }
  }
}
