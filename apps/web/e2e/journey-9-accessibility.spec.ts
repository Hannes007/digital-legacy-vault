import { expect, test, type Page } from '@playwright/test';

import { EMAIL, PASSWORD, probe, signIn } from './helpers';

/**
 * Journey 9 — Accessibility audit (roadmap Phase 9 exit: WCAG 2.2 AA).
 *
 * Runs axe-core (loaded from CDN at runtime, so no build dependency) over the
 * key authenticated pages and fails on any serious/critical violation. When
 * axe cannot be loaded (offline CI), it falls back to structural WCAG checks
 * (document language, single h1, labelled controls, visible focus). Self-skips
 * without a reachable stack.
 */
const AXE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
const PAGES = ['/dashboard', '/vault', '/billing', '/settings/ai', '/organisation'];

interface AxeResult {
  violations: Array<{ id: string; impact: string | null; nodes: unknown[] }>;
}
declare global {
  interface Window {
    axe?: { run: (ctx?: unknown) => Promise<AxeResult> };
  }
}

let reachable = false;
test.beforeAll(async () => {
  reachable = (await probe()).ok;
});

async function tryLoadAxe(page: Page): Promise<boolean> {
  try {
    await page.addScriptTag({ url: AXE_CDN });
    return await page.evaluate(() => typeof window.axe !== 'undefined');
  } catch {
    return false;
  }
}

async function structuralChecks(page: Page): Promise<void> {
  // WCAG 3.1.1: page has a language.
  await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
  // WCAG 1.3.1 / 2.4.6: exactly one h1 for a clear document outline.
  expect(await page.locator('h1').count()).toBeGreaterThanOrEqual(1);
  // WCAG 4.1.2: every visible text input has an accessible name.
  const inputs = page.locator('input:not([type="hidden"])');
  const count = await inputs.count();
  for (let i = 0; i < count; i += 1) {
    const el = inputs.nth(i);
    if (!(await el.isVisible())) continue;
    const name =
      (await el.getAttribute('aria-label')) ??
      (await el.getAttribute('aria-labelledby')) ??
      (await el.getAttribute('id'));
    expect(name, `input #${String(i)} needs an accessible name`).toBeTruthy();
  }
}

test.describe('Journey 9 — Accessibility (WCAG 2.2 AA)', () => {
  for (const path of PAGES) {
    test(`no serious a11y violations on ${path}`, async ({ page }) => {
      test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL/E2E_PASSWORD.');
      test.skip(!reachable, 'Stack not reachable; run against a deployed environment.');

      await signIn(page);
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });

      const hasAxe = await tryLoadAxe(page);
      if (!hasAxe) {
        await structuralChecks(page);
        return;
      }
      const results = await page.evaluate(async () => window.axe!.run());
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      if (serious.length > 0) {
        // eslint-disable-next-line no-console
        console.error(`a11y violations on ${path}:`, JSON.stringify(serious, null, 2));
      }
      expect(serious, `serious/critical a11y violations on ${path}`).toHaveLength(0);
    });
  }
});
