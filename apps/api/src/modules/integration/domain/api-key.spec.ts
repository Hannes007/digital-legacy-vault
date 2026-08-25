import { API_KEY_PREFIX, generateApiKey, hashApiKey, looksLikeApiKey } from './api-key';

describe('API key generation (Phase 8)', () => {
  it('generates a prefixed key whose hash round-trips and prefix matches', () => {
    const { apiKey, prefix, keyHash } = generateApiKey();
    expect(apiKey.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(apiKey.startsWith(prefix)).toBe(true);
    expect(hashApiKey(apiKey)).toBe(keyHash);
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique keys', () => {
    expect(generateApiKey().apiKey).not.toBe(generateApiKey().apiKey);
  });

  it('recognises well-formed keys and rejects junk', () => {
    expect(looksLikeApiKey(generateApiKey().apiKey)).toBe(true);
    expect(looksLikeApiKey('dlv_sk_short')).toBe(false);
    expect(looksLikeApiKey('sk_live_123')).toBe(false);
  });
});
