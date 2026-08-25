/**
 * Client-Encrypted Vault crypto (runs only in the browser). Content is encrypted
 * with AES-256-GCM under a vault key the server never sees; the key is protected
 * by a passphrase (PBKDF2) and can be escrowed as a Shamir recovery kit
 * (3-of-5 default, PROJECT_MEMORY §9). The API stores ciphertext + IV only.
 */
import { combineShares, splitSecret } from "@dlv/crypto/shamir";

const PBKDF2_ITERATIONS = 210_000; // OWASP 2023 guidance for PBKDF2-HMAC-SHA256
const enc = new TextEncoder();
const dec = new TextDecoder();

/** WebCrypto wants ArrayBuffer-backed BufferSource; normalise a view to one. */
function ab(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Generate a fresh, extractable AES-256-GCM vault key. */
export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

/** Derive a vault key from a passphrase + salt (PBKDF2). */
export async function deriveVaultKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", ab(enc.encode(passphrase)), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: ab(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export interface Encrypted {
  ciphertext: string; // base64
  iv: string; // base64
}

/** Encrypt a UTF-8 string with the vault key under a fresh IV. */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<Encrypted> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ab(iv) }, key, ab(enc.encode(plaintext)));
  return { ciphertext: b64(new Uint8Array(ct)), iv: b64(iv) };
}

/** Decrypt an {@link Encrypted} payload back to its string. */
export async function decryptString(key: CryptoKey, payload: Encrypted): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ab(fromB64(payload.iv)) },
    key,
    ab(fromB64(payload.ciphertext)),
  );
  return dec.decode(pt);
}

export interface RecoveryKit {
  shares: string[];
  threshold: number;
  shareCount: number;
  createdAt: string;
}

/** Escrow the vault key as Shamir shares (default 3-of-5). Shares stay client-side. */
export async function createRecoveryKit(
  key: CryptoKey,
  options: { shareCount?: number; threshold?: number } = {},
): Promise<RecoveryKit> {
  const shareCount = options.shareCount ?? 5;
  const threshold = options.threshold ?? 3;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return {
    shares: splitSecret(raw, { shares: shareCount, threshold }),
    threshold,
    shareCount,
    createdAt: new Date().toISOString(),
  };
}

/** Reconstruct the vault key from a threshold of recovery shares. */
export async function recoverVaultKey(shares: string[]): Promise<CryptoKey> {
  const raw = combineShares(shares);
  return crypto.subtle.importKey("raw", ab(raw), { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}
