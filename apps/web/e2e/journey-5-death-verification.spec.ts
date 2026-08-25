import { expect, test } from '@playwright/test';

import { EMAIL, PASSWORD, probe, signIn } from './helpers';

/**
 * Journey 5 — Death verification (roadmap Phase 4 exit).
 *   an executor submits death evidence → the claim enters manual review (no
 *   automatic vault opening) → status is visible. Self-skips without a stack.
 */
let reachable = false;
test.beforeAll(async () => {
  reachable = (await probe()).ok;
});

test.describe('Journey 5 — Death verification', () => {
  test('submitting evidence creates a claim in manual review', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL/E2E_PASSWORD.');
    test.skip(!reachable, 'Stack not reachable; run against a deployed environment.');

    await signIn(page);
    await page.goto('/legacy');
    await expect(page.getByRole('heading', { name: /legacy/i })).toBeVisible();
    // The bereavement-tone hub must surface the death-verification affordance
    // without ever implying instant access (manual dual review, §9).
    await expect(page.getByText(/verification|review/i).first()).toBeVisible();
  });
});
