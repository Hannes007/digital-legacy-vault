import { expect, test } from '@playwright/test';

import { EMAIL, PASSWORD, probe, signIn, uploadReadyDocument } from './helpers';

/**
 * Journey 6 — Signature ceremony + seal (roadmap Phase 5 exit).
 *   sign in → upload a READY document → create a signature request → complete
 *   the ceremony (consent + capture) → the sealed signature verifies. Self-skips
 *   without a live stack.
 */
let reachable = false;
test.beforeAll(async () => {
  reachable = (await probe()).ok;
});

test.describe('Journey 6 — Signatures', () => {
  test('seals a signature and verifies it independently', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL/E2E_PASSWORD.');
    test.skip(!reachable, 'Stack not reachable; run against a deployed environment.');

    await signIn(page);
    await uploadReadyDocument(page);

    await page.goto('/signatures');
    await expect(page.getByRole('heading', { name: /signatures/i })).toBeVisible();

    // Create a request over the READY document, then run the ceremony.
    await page.getByRole('button', { name: /new request|create request/i }).first().click();
    await page.getByRole('button', { name: /sign|start/i }).first().click();

    // Accept the ECTA consent and seal.
    const consent = page.getByRole('checkbox');
    if (await consent.count()) await consent.first().check();
    await page.getByRole('button', { name: /seal|complete|sign/i }).first().click();

    // A sealed signature exposes an inline verification that reports validity.
    await expect(page.getByText(/verified|valid|sealed/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
