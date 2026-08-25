# @dlv/eslint-config

Shared ESLint 9 flat-config presets for Digital Legacy Vault. Plain JavaScript,
no build step. Plugins ship as regular dependencies, so consuming workspaces
only need `eslint` itself (peer dependency, `^9`).

## Presets

| Preset | Contents |
|---|---|
| `base` | `typescript-eslint` strict-type-checked (via the project service — each package just needs its own `tsconfig.json`), `eslint-plugin-import-x` deterministic import order, `no-console` (only `warn`/`error` allowed). Type-aware rules are disabled for plain `.js/.mjs/.cjs` files. |
| `nest` | `base` + decorator-friendly: `no-extraneous-class` allows decorated classes and is off for `*.module.ts`; constructor parameter properties (Nest DI style) allowed. |
| `next` | `base` + `@next/eslint-plugin-next` (recommended + core-web-vitals) + `eslint-plugin-react-hooks`. |

## Usage

Named import from the package root:

```js
// packages/*/eslint.config.mjs
import { base } from '@dlv/eslint-config';

export default base;
```

Default import from a subpath:

```js
// apps/api/eslint.config.mjs
import nest from '@dlv/eslint-config/nest';

export default [{ ignores: ['dist/**'] }, ...nest];
```

```js
// apps/web/eslint.config.mjs
import next from '@dlv/eslint-config/next';

export default [{ ignores: ['.next/**'] }, ...next];
```

Every preset is a plain flat-config array — spread it and append overrides as
needed.
