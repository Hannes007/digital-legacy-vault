/**
 * UUIDv7 — time-ordered identifiers (PROJECT_MEMORY §8: IDs are UUIDv7).
 * Implemented on node:crypto so no extra dependency is pulled into the kernel.
 */
import { randomBytes } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Generate a UUIDv7 (48-bit ms timestamp prefix + 74 random bits). */
export function uuidv7(now: number = Date.now()): string {
  const buf = Buffer.alloc(16);
  buf.writeUIntBE(now, 0, 6); // 48-bit big-endian millisecond timestamp
  randomBytes(10).copy(buf, 6);
  buf[6] = ((buf[6] ?? 0) & 0x0f) | 0x70; // version 7
  buf[8] = ((buf[8] ?? 0) & 0x3f) | 0x80; // RFC 4122 variant
  const hex = buf.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** True for any RFC 4122 UUID (versions 1–8). */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** True only for a version-7 UUID. */
export function isUuidV7(value: string): boolean {
  return isUuid(value) && value.charAt(14) === '7';
}
