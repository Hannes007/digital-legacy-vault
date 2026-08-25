# @dlv/design-tokens

The single source of truth for Digital Legacy Vault's visual language.

- **`src/tokens.dtcg.json`** — W3C DTCG (`$type`/`$value`) source, mirroring
  `docs/05-design/design-tokens.md`.
- **`theme.css`** — Tailwind 4 `@theme` layer + `.dark` overrides. Utilities bind
  to the **semantic** layer only; components never reference primitive scales.
- **`src/index.ts`** — the resolved values as typed `as const` objects
  (`primitives`, `semantic`, `space`, `radius`, `font`, `motion`, `zIndex`,
  `breakpoint`, `overlay`) for programmatic use (charts, emails, canvas).

## Usage

Tailwind (apps/web):
```css
/* apps/web/src/app/globals.css */
@import "@dlv/design-tokens/theme.css";
```

TypeScript:
```ts
import { semantic, radius } from "@dlv/design-tokens";
const accent = semantic.dark.accent; // "#6BA7DB"
```

Dark mode flips by toggling the `.dark` class on `<html>` (see the web theme
helper) — semantic variables switch, primitives don't.
