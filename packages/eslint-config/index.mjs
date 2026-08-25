/**
 * @dlv/eslint-config — shared ESLint 9 flat-config presets
 * (phase-2-contracts §workspace packages, coding-standards §11).
 *
 * Consumers may import named presets from the package root or default-import
 * a single preset from its subpath (`@dlv/eslint-config/nest`, …).
 */

export { default as base } from './base.mjs';
export { default as nest } from './nest.mjs';
export { default as next } from './next.mjs';
