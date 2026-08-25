import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

/**
 * Base preset for every DLV workspace package (coding-standards §11):
 * typescript-eslint strict-type-checked, deterministic import ordering, and
 * no `console` output except `console.warn` / `console.error` (structured
 * loggers everywhere else).
 *
 * Type-aware linting uses the typescript-eslint project service, so each
 * consuming package only needs its own `tsconfig.json` — no per-package
 * parser wiring.
 */
const base = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
    ],
  },

  ...tseslint.configs.strictTypeChecked,

  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      'import-x': importX,
    },
    rules: {
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // Plain JS files (config files, scripts) are not covered by tsconfig
  // projects — disable the type-aware rules for them.
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    ...tseslint.configs.disableTypeChecked,
  },
];

export default base;
