import { expect, test } from '@playwright/test';

import { API_URL, EMAIL, PASSWORD, probe, signIn } from './helpers';

/**
 * Journey 8 — Organisation onboarding + integrations (roadmap Phase 8 exit).
 *   sign in → open the organisation hub → issue a scoped API key → the partner
 *   API authenticates it and honours the scope. Self-skips without a stack.
 */
let reachable = false;
test.beforeAll(async () => {
  reachable = (await probe()).ok;
});

test.describe('Journey 8 — Organisation & integrations', () => {
  test('issues a scoped API key that authenticates against the partner API', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL/E2E_PASSWORD.');
    test.skip(!reachable, 'Stack not reachable; run against a deployed environment.');

    await signIn(page);
    await page.goto('/organisation');
    await expect(page.getByRole('heading', { name: /organisation/i })).toBeVisible();

    // Issue a documents:read key via the API (the UI shows it once).
    const token = await page.evaluate(() => localStorage.getItem('dlv_access_token'));
    const auth = token ? { Authorization: `Bearer ${token}` } : {};
    const created = await fetch(`${API_URL}/api/v1/integration/api-keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ name: 'e2e', scopes: ['documents:read'] }),
    });
    expect(created.status).toBe(201);
    const { apiKey } = (await created.json()) as { apiKey: string };
    expect(apiKey.startsWith('dlv_sk_')).toBe(true);

    // The partner API accepts the key and enforces the scope.
    const ping = await fetch(`${API_URL}/api/v1/partner/ping`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(ping.status).toBe(200);
    const docs = await fetch(`${API_URL}/api/v1/partner/documents`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(docs.status).toBe(200);
  });
});
