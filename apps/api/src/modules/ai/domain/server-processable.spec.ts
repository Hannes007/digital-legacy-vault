import { VaultKind } from '@dlv/shared-types';

import {
  ClientEncryptedExclusionError,
  toServerProcessable,
  truncateProcessable,
} from './server-processable';

describe('server-processable guard (coding-standards §10.8)', () => {
  it('accepts STANDARD-vault text', () => {
    const text = toServerProcessable({ vaultKind: VaultKind.STANDARD, text: 'hello' });
    expect(text).toBe('hello');
  });

  it('throws ClientEncryptedExclusionError for CLIENT_ENCRYPTED vaults', () => {
    expect(() =>
      toServerProcessable({ vaultKind: VaultKind.CLIENT_ENCRYPTED, text: 'secret' }),
    ).toThrow(ClientEncryptedExclusionError);
  });

  it('truncates to the input budget without losing content under it', () => {
    const text = toServerProcessable({ vaultKind: VaultKind.STANDARD, text: 'a'.repeat(100) });
    expect(truncateProcessable(text, 40)).toHaveLength(40);
    expect(truncateProcessable(text, 200)).toHaveLength(100);
  });
});
