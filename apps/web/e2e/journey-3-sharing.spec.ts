import { expect, test } from '@playwright/test';

import { EMAIL, PASSWORD, probe, signIn, uploadReadyDocument } from './helpers';

/**
 * Journey 3 — Sharing & access requests (roadmap Phase 4 exit).
 *   sign in → upload a READY document → create a secure link → the one-time
 *   public resolve URL opens without auth. Self-skips without a live stack.
 */
let reachable = false;
test.beforeAll(async () => {
  reachable = (await probe()).ok;
});

test.describe('Journey 3 — Sharing', () => {
  test('creates a secure link that resolves on the public endpoint', async ({ page, context }) => {
    test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL/E2E_PASSWORD.');
    test.skip(!reachable, 'Stack not reachable; run against a deployed environment.');

    await signIn(page);
    const fileName = await uploadReadyDocument(page);

    await page.getByText(fileName, { exact: false }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /share/i }).click();

    // Generate a secure link and capture it.
    await page.getByRole('button', { name: /secure link|create link/i }).click();
    const linkField = page.getByRole('textbox', { name: /link|url/i }).first();
    await expect(linkField).toBeVisible({ timeout: 10_000 });
    const url = await linkField.inputValue();
    expect(url).toContain('/s/');

    // The link opens without an authenticated session (fresh context).
    const anon = await context.browser()?.newContext();
    if (anon) {
      const anonPage = await anon.newPage();
      const res = await anonPage.goto(url);
      expect(res?.status()).toBeLessThan(400);
      await anon.close();
    }
  });
});
