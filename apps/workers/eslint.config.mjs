// Flat ESLint config for apps/workers — delegates to the shared Nest preset.
import nest from '@dlv/eslint-config/nest';

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  ...nest,
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
];
