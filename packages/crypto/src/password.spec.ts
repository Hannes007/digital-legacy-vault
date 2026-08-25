import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './index.js';

describe('hashPassword', () => {
  it('produces an argon2id PHC string with the contracted parameters (m=19456, t=2, p=1)', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).toContain('m=19456,t=2,p=1');
  });

  it('salts every hash (same password twice → different hashes)', async () => {
    const first = await hashPassword('same-password');
    const second = await hashPassword('same-password');
    expect(first).not.toBe(second);
  });
});

describe('verifyPassword', () => {
  it('verifies the correct password', async () => {
    const hash = await hashPassword('S3cure-passphrase!');
    await expect(verifyPassword(hash, 'S3cure-passphrase!')).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('S3cure-passphrase!');
    await expect(verifyPassword(hash, 'wrong-passphrase')).resolves.toBe(false);
  });

  it('returns false (never throws) for a malformed stored hash', async () => {
    await expect(verifyPassword('not-a-phc-hash', 'anything')).resolves.toBe(false);
  });

  it('returns false for an empty stored hash', async () => {
    await expect(verifyPassword('', 'anything')).resolves.toBe(false);
  });

  it('round-trips unicode passwords', async () => {
    const password = 'pässwörd-✓-驗證-🔐';
    const hash = await hashPassword(password);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    await expect(verifyPassword(hash, `${password} `)).resolves.toBe(false);
  });
});
