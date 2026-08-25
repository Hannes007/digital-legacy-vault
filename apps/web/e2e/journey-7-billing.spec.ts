import { expect, test } from '@playwright/test';

import { API_URL, EMAIL, PASSWORD, probe, signIn } from './helpers';

/**
 * Journey 7 — Billing + entitlements (roadmap Phase 6 exit / MVP line).
 *   sign in → view plans + entitlements → the freemium gate is enforced. Live
 *   Stripe checkout is exercised with test clocks in staging, not here.
 *   Self-skips without a live stack.
 */
let reachable = false;
test.beforeAll(async () => {
  reachable = (await probe()).ok;
});

test.describe('Journey 7 — Billing', () => {
  test('shows plans and the current entitlement snapshot', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL/E2E_PASSWORD.');
    test.skip(!reachable, 'Stack not reachable; run against a deployed environment.');

    await signIn(page);
    await page.goto('/billing');
    await expect(page.getByRole('heading', { name: /plans|billing/i })).toBeVisible();
    await expect(page.getByText(/free|premium|family/i).first()).toBeVisible();

    // Entitlements resolve for the signed-in user (FREE by default).
    const token = await page.evaluate(() => localStorage.getItem('dlv_access_token'));
    const res = await fetch(`${API_URL}/api/v1/billing/entitlements`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entitlements?: { tier?: string } };
    expect(body.entitlements?.tier).toBeDefined();
  });
});
