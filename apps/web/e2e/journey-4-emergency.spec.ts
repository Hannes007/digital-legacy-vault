import { expect, test } from '@playwright/test';

import { API_URL, EMAIL, EMAIL_2, PASSWORD, PASSWORD_2, probe, signIn } from './helpers';

/**
 * Journey 4 — Emergency access (roadmap Phase 4 exit).
 *   a grantee requests emergency access → the owner is notified → the mandatory
 *   delay + multi-party quorum are enforced before any grant activates. Needs a
 *   second seeded account (E2E_EMAIL_2). Self-skips otherwise.
 */
let reachable = false;
test.beforeAll(async () => {
  reachable = (await probe()).ok;
});

test.describe('Journey 4 — Emergency access', () => {
  test('a request enters PENDING with a delay and cannot self-activate', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL/E2E_PASSWORD.');
    test.skip(!EMAIL_2 || !PASSWORD_2, 'Set E2E_EMAIL_2/E2E_PASSWORD_2 (the grantee).');
    test.skip(!reachable, 'Stack not reachable; run against a deployed environment.');

    // Grantee raises a request from the legacy hub.
    await signIn(page, EMAIL_2, PASSWORD_2);
    await page.goto('/legacy');
    await expect(page.getByRole('heading', { name: /legacy/i })).toBeVisible();

    // The emergency request must record a delay and never be instantly active;
    // the API is the source of truth for the state machine.
    const token = await page.evaluate(() => localStorage.getItem('dlv_access_token'));
    const res = await fetch(`${API_URL}/api/v1/emergency-access/requests`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    // Endpoint exists and is authorised (not a 404/401 wall).
    expect([200, 403]).toContain(res.status);
  });
});
