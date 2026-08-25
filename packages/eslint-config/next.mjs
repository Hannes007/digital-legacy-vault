import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

import base from './base.mjs';

/**
 * Preset for the Next.js app (apps/web): base rules plus the official
 * Next.js plugin at core-web-vitals level and the rules-of-hooks checks.
 */
const next = [
  ...base,

  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
];

export default next;
