# @dlv/crypto

All cryptographic primitives for Digital Legacy Vault. **Security invariant
(coding-standards §10.3):** application code never imports `node:crypto`
directly — every hash, MAC, token and cipher operation goes through this
package so algorithms and parameters stay centrally auditable.

Implements the frozen contract in `docs/02-architecture/phase-2-contracts.md`.

## API

| Export | Purpose |
|---|---|
| `sha256Hex(data)` | SHA-256 → lowercase hex (audit hash chain, upload hashing) |
| `hmacSha256Hex(key, data)` | HMAC-SHA-256 → lowercase hex (keyed integrity) |
| `generateOpaqueToken(bytes?)` | CSPRNG token, base64url, default 32 bytes |
| `hashPassword(password)` | Argon2id, m=19456 KiB, t=2, p=1 (PHC string) |
| `verifyPassword(hash, password)` | Constant-time verify; `false` on any failure, never throws |
| `createAesGcmFieldCipher(key)` | AES-256-GCM field-level cipher (32-byte key) |
| `FieldCipher` / `FieldCipherError` | Cipher interface and its error type |

## Field-encryption wire format

```
dlv1.<iv_b64url>.<tag_b64url>.<ct_b64url>
```

- Versioned prefix (`dlv1`), 12-byte random IV per encryption, 16-byte GCM tag.
- Optional AAD binds a ciphertext to its context (e.g. `table.column:rowId`).
- `decrypt` throws `FieldCipherError` on any format, key-size, wrong-key,
  wrong-AAD or bit-tamper problem. Error messages never contain secrets.

## Usage

```ts
import { createAesGcmFieldCipher, generateOpaqueToken, hashPassword, sha256Hex, verifyPassword } from '@dlv/crypto';

const eventHash = sha256Hex(prevHash + canonicalJson);

const stored = await hashPassword('user-password');
const ok = await verifyPassword(stored, 'user-password');

const cipher = createAesGcmFieldCipher(Buffer.from(env.FIELD_ENCRYPTION_KEY_B64, 'base64'));
const sealed = cipher.encrypt('8001015009087', `users.id_number:${userId}`);
const idNumber = cipher.decrypt(sealed, `users.id_number:${userId}`);

const refreshTokenId = generateOpaqueToken(); // 32 bytes, base64url
```

## Commands

| Command | Purpose |
|---|---|
| `pnpm build` | tsup → `dist/` (esm + cjs + d.ts) |
| `pnpm test` | vitest with v8 coverage — **100% thresholds enforced** |
| `pnpm typecheck` / `pnpm lint` / `pnpm clean` | as usual |
