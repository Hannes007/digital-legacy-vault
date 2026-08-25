import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for Journey 2 (Vault Core). Runs against an already-deployed stack
 * (web + api + S3 + KMS + ClamAV + Postgres/Redis) — set PLAYWRIGHT_BASE_URL and
 * DLV_API_URL, plus a seeded, email-verified test account (E2E_EMAIL/E2E_PASSWORD).
 * The suite self-skips when the stack or credentials are absent, so it never
 * fails a unit CI run; wire it into an environment-gated E2E job.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
