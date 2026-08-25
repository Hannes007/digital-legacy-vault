import base from './base.mjs';

/**
 * Preset for NestJS services (apps/api): the base rules made
 * decorator-friendly.
 *
 * - Decorated classes (`@Module`, `@Injectable`, `@Controller`, …) are
 *   legitimate even when otherwise "extraneous"; `*.module.ts` files are
 *   pure decorator carriers, so the rule is off there entirely.
 * - Constructor parameter properties are the idiomatic Nest dependency-
 *   injection style and are explicitly allowed.
 */
const nest = [
  ...base,

  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowWithDecorator: true },
      ],
      '@typescript-eslint/parameter-properties': 'off',
    },
  },

  {
    files: ['**/*.module.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];

export default nest;
