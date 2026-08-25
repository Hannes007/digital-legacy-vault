import { defineConfig } from 'vitest/config';

// Unit tests only. Playwright E2E specs live in ./e2e and must NOT be collected
// by Vitest (they import @playwright/test).
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    environment: 'node',
  },
});
