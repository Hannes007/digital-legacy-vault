import { expect, test, type Page } from '@playwright/test';

/**
 * Journey 2 — Vault Core (roadmap Phase 3 exit criterion).
 *
 *   sign in → upload a document → pipeline scans/validates/encrypts/promotes →
 *   the document shows READY → open it → version history + audit timeline.
 *
 * Prerequisites (env): PLAYWRIGHT_BASE_URL, DLV_API_URL, E2E_EMAIL, E2E_PASSWORD
 * (a seeded, email-verified account). Absent any of these — or an unreachable
 * stack — the suite self-skips. The READY wait also exercises the upload SLA
 * budget (p95 < 60 s for <= 25 MB); the elapsed time is logged.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const API_URL = process.env.DLV_API_URL ?? 'http://localhost:4000';
const EMAIL = process.env.E2E_EMAIL ?? '';
const PASSWORD = process.env.E2E_PASSWORD ?? '';
const READY_BUDGET_MS = 60_000;

// A minimal valid 1x1 PNG (signature + IHDR/IDAT/IEND) so magic-byte validation passes.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let reachable = false;

test.beforeAll(async () => {
  if (!EMAIL || !PASSWORD) return;
  try {
    const [web, api] = await Promise.all([
      fetch(BASE_URL, { method: 'GET' }),
      fetch(`${API_URL}/health/ready`, { method: 'GET' }),
    ]);
    reachable = web.ok && api.ok;
  } catch {
    reachable = false;
  }
});

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Land in the authenticated shell (dashboard or vault).
  await page.waitForURL(/\/(dashboard|vault)/, { timeout: 20_000 });
}

test.describe('Journey 2 — Vault Core', () => {
  test('uploads, scans, promotes and shows a document with its timeline', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL/E2E_PASSWORD for a seeded verified account.');
    test.skip(!reachable, 'Web + API stack not reachable; run against a deployed environment.');

    const fileName = `e2e-${Date.now().toString()}.png`;

    await signIn(page);
    await page.goto('/vault');
    await expect(page.getByRole('heading', { name: 'Vault' })).toBeVisible();

    // Upload via the dropzone's (hidden) file input.
    await page.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_BASE64, 'base64'),
    });

    // The card appears immediately (PENDING_UPLOAD/SCANNING) then reaches READY.
    const card = page.getByText(fileName, { exact: false });
    await expect(card).toBeVisible({ timeout: 20_000 });

    const started = Date.now();
    await expect(async () => {
      await page.reload();
      await expect(page.getByText(fileName, { exact: false })).toBeVisible();
      await expect(page.getByText('READY', { exact: false }).first()).toBeVisible();
    }).toPass({ timeout: READY_BUDGET_MS, intervals: [2000, 3000, 5000] });
    const elapsedMs = Date.now() - started;
    // eslint-disable-next-line no-console
    console.log(`Journey 2: ${fileName} reached READY in ${String(elapsedMs)} ms (budget ${String(READY_BUDGET_MS)} ms)`);
    expect(elapsedMs).toBeLessThan(READY_BUDGET_MS);

    // Open the document; the preview shows version history + the audit timeline.
    await page.getByText(fileName, { exact: false }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/^v1$/)).toBeVisible();
    await expect(dialog.getByText('Activity')).toBeVisible();
    // The promotion writes a hash-chained audit entry surfaced in the timeline.
    await expect(dialog.getByText(/scanned|encrypted|saved/i)).toBeVisible();
  });
});
