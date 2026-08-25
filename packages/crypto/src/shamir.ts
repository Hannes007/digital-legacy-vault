/**
 * Shamir Secret Sharing over GF(2^8) — the recovery-kit primitive for the
 * Client-Encrypted Vault (PROJECT_MEMORY §9: 3-of-5 default). Pure, dependency
 * free, and browser-safe (uses WebCrypto `getRandomValues`, available in Node 20+
 * and browsers), so it is shared by the server and the client via the
 * `@dlv/crypto/shamir` subpath export.
 */
export class ShamirError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShamirError';
  }
}

// GF(2^8) exp/log tables (primitive polynomial 0x11d).
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
    x &= 0xff;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
})();

function mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a]! + LOG[b]!]!;
}

function div(a: number, b: number): number {
  /* v8 ignore next -- defensive: callers reject duplicate x-coords so b is never 0 */
  if (b === 0) throw new ShamirError('division by zero in GF(256)');
  /* v8 ignore next -- defensive: numerator is a product of non-zero x-coords */
  if (a === 0) return 0;
  return EXP[(LOG[a]! - LOG[b]! + 255) % 255]!;
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

export interface SplitOptions {
  shares: number;
  threshold: number;
}

/**
 * Split a secret into `shares` base64 pieces, any `threshold` of which
 * reconstruct it. Each piece encodes its x-coordinate in byte 0.
 */
export function splitSecret(secret: Uint8Array, options: SplitOptions): string[] {
  const { shares, threshold } = options;
  if (!Number.isInteger(shares) || !Number.isInteger(threshold)) {
    throw new ShamirError('shares and threshold must be integers');
  }
  if (threshold < 2 || threshold > shares) throw new ShamirError('require 2 <= threshold <= shares');
  if (shares > 255) throw new ShamirError('at most 255 shares');
  if (secret.byteLength === 0) throw new ShamirError('secret must be non-empty');

  const out: Uint8Array[] = [];
  for (let s = 1; s <= shares; s++) {
    const piece = new Uint8Array(secret.byteLength + 1);
    piece[0] = s; // x-coordinate (never 0)
    out.push(piece);
  }

  for (let byteIndex = 0; byteIndex < secret.byteLength; byteIndex++) {
    // random polynomial with constant term = secret byte
    const coeffs = new Uint8Array(threshold);
    coeffs[0] = secret[byteIndex]!;
    coeffs.set(randomBytes(threshold - 1), 1);
    for (let s = 1; s <= shares; s++) {
      let y = 0;
      for (let power = threshold - 1; power >= 0; power--) {
        y = mul(y, s) ^ coeffs[power]!;
      }
      out[s - 1]![byteIndex + 1] = y;
    }
  }

  return out.map((p) => Buffer.from(p).toString('base64'));
}

/** Reconstruct a secret from `threshold` (or more) shares. */
export function combineShares(shares: string[]): Uint8Array {
  if (shares.length < 2) throw new ShamirError('need at least 2 shares');
  const pieces = shares.map((s) => new Uint8Array(Buffer.from(s, 'base64')));
  const len = pieces[0]!.byteLength - 1;
  if (len <= 0) throw new ShamirError('malformed share');
  const xs = pieces.map((p) => p[0]!);
  if (new Set(xs).size !== xs.length) throw new ShamirError('duplicate share x-coordinates');
  if (pieces.some((p) => p.byteLength - 1 !== len)) throw new ShamirError('inconsistent share lengths');

  const secret = new Uint8Array(len);
  for (let byteIndex = 0; byteIndex < len; byteIndex++) {
    let acc = 0;
    for (let i = 0; i < pieces.length; i++) {
      const xi = xs[i]!;
      let num = 1;
      let den = 1;
      for (let j = 0; j < pieces.length; j++) {
        if (i === j) continue;
        num = mul(num, xs[j]!); // (0 - xj) == xj in GF(2^8)
        den = mul(den, xi ^ xs[j]!);
      }
      const lagrange = div(num, den);
      acc ^= mul(pieces[i]![byteIndex + 1]!, lagrange);
    }
    secret[byteIndex] = acc;
  }
  return secret;
}
