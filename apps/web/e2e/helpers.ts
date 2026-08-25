import { expect, type Page } from '@playwright/test';

/**
 * Shared harness for the gated end-to-end journeys (roadmap Phases 3–8, run in
 * Phase 9 hardening). Every journey self-skips unless a reachable stack and a
 * seeded, email-verified account are supplied via env — so the suite is safe to
 * run in CI against an ephemeral environment and inert everywhere else.
 */
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
export const API_URL = process.env.DLV_API_URL ?? 'http://localhost:4000';
export const EMAIL = process.env.E2E_EMAIL ?? '';
export const PASSWORD = process.env.E2E_PASSWORD ?? '';
/** Optional second seeded account (executor/beneficiary/professional side). */
export const EMAIL_2 = process.env.E2E_EMAIL_2 ?? '';
export const PASSWORD_2 = process.env.E2E_PASSWORD_2 ?? '';

export interface Reachability {
  ok: boolean;
}

/** Probe the web app + API readiness once, in a beforeAll. */
export async function probe(): Promise<Reachability> {
  if (!EMAIL || !PASSWORD) return { ok: false };
  try {
    const [web, api] = await Promise.all([
      fetch(BASE_URL, { method: 'GET' }),
      fetch(`${API_URL}/health/ready`, { method: 'GET' }),
    ]);
    return { ok: web.ok && api.ok };
  } catch {
    return { ok: false };
  }
}

export async function signIn(page: Page, email = EMAIL, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/(dashboard|vault)/, { timeout: 20_000 });
}

/** A minimal valid 1x1 PNG so magic-byte validation passes on upload. */
export const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** Upload a PNG through the vault dropzone and wait for READY. */
export async function uploadReadyDocument(page: Page, budgetMs = 60_000): Promise<string> {
  const fileName = `e2e-${Date.now().toString()}.png`;
  await page.goto('/vault');
  await page.locator('input[type="file"]').setInputFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_BASE64, 'base64'),
  });
  await expect(page.getByText(fileName, { exact: false })).toBeVisible({ timeout: 20_000 });
  await expect(async () => {
    await page.reload();
    await expect(page.getByText(fileName, { exact: false })).toBeVisible();
    await expect(page.getByText('READY', { exact: false }).first()).toBeVisible();
  }).toPass({ timeout: budgetMs, intervals: [2000, 3000, 5000] });
  return fileName;
}
