// Flat ESLint config for apps/api — delegates all rules (including
// clean-architecture boundary enforcement) to the shared Nest preset.
import nest from '@dlv/eslint-config/nest';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'prisma/migrations/**'],
  },
  ...nest,
  {
    // Tests exercise mocks (jest.Mocked casts) and HTTP clients (supertest)
    // whose surfaces are intentionally loosely typed; the type-aware "unsafe"
    // family is noise there without improving safety of the code under test.
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'import-x/no-duplicates': 'error',
    },
  },
];
