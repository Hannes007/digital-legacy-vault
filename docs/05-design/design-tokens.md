# Digital Legacy Vault — Design Tokens

| Document control | |
|---|---|
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Design Team |
| Related | `docs/05-design/design-system.md` (values must match exactly) |

Tokens follow the W3C Design Tokens Community Group format (`$type` / `$value`). The JSON blocks below are the machine-readable source of truth; they will live in `packages/design-tokens/` in the monorepo and compile to the Tailwind 4 `@theme` layer shown in §8. File names in the package are kebab-case per PROJECT_MEMORY §8.

---

## 1. Colour primitives

```json
{
  "color": {
    "white": { "$type": "color", "$value": "#FFFFFF" },
    "grey": {
      "25":  { "$type": "color", "$value": "#F7F8FA" },
      "50":  { "$type": "color", "$value": "#F2F4F7" },
      "100": { "$type": "color", "$value": "#E4E7EC" },
      "200": { "$type": "color", "$value": "#D0D5DD" },
      "300": { "$type": "color", "$value": "#98A2B3" },
      "400": { "$type": "color", "$value": "#8B94A6" },
      "500": { "$type": "color", "$value": "#6C7689" },
      "600": { "$type": "color", "$value": "#5D6B82" },
      "700": { "$type": "color", "$value": "#4A5468" },
      "800": { "$type": "color", "$value": "#2A303C" },
      "850": { "$type": "color", "$value": "#1F242E" },
      "875": { "$type": "color", "$value": "#1C212A" },
      "900": { "$type": "color", "$value": "#1D2433" },
      "925": { "$type": "color", "$value": "#171B22" },
      "950": { "$type": "color", "$value": "#0E1116" }
    },
    "blue": {
      "50":  { "$type": "color", "$value": "#F2F7FC" },
      "100": { "$type": "color", "$value": "#E3EEF9" },
      "200": { "$type": "color", "$value": "#C4DDF2" },
      "300": { "$type": "color", "$value": "#9CC5E8" },
      "350": { "$type": "color", "$value": "#8FBCE5" },
      "400": { "$type": "color", "$value": "#6BA7DB" },
      "500": { "$type": "color", "$value": "#4288C8" },
      "600": { "$type": "color", "$value": "#2F6EAD" },
      "700": { "$type": "color", "$value": "#275C91" },
      "800": { "$type": "color", "$value": "#224C77" },
      "900": { "$type": "color", "$value": "#1E4062" },
      "950": { "$type": "color", "$value": "#1D3049" }
    },
    "green": {
      "400": { "$type": "color", "$value": "#4CC38A" },
      "600": { "$type": "color", "$value": "#1B7F4D" }
    },
    "amber": {
      "400": { "$type": "color", "$value": "#E5A13D" },
      "600": { "$type": "color", "$value": "#A15C07" }
    },
    "red": {
      "400": { "$type": "color", "$value": "#F2716A" },
      "600": { "$type": "color", "$value": "#B42318" }
    },
    "violet": {
      "400": { "$type": "color", "$value": "#A79BE8" },
      "600": { "$type": "color", "$value": "#5B4FB0" }
    },
    "overlay": { "$type": "color", "$value": "#101828" }
  }
}
```

## 2. Semantic colour aliases

### 2.1 Light

```json
{
  "semantic": {
    "light": {
      "bg-canvas":      { "$type": "color", "$value": "{color.grey.25}" },
      "bg-surface":     { "$type": "color", "$value": "{color.white}" },
      "bg-raised":      { "$type": "color", "$value": "{color.white}" },
      "bg-subtle":      { "$type": "color", "$value": "{color.grey.50}" },
      "border-default": { "$type": "color", "$value": "{color.grey.100}" },
      "border-strong":  { "$type": "color", "$value": "{color.grey.300}" },
      "text-primary":   { "$type": "color", "$value": "{color.grey.900}" },
      "text-secondary": { "$type": "color", "$value": "{color.grey.700}" },
      "text-muted":     { "$type": "color", "$value": "{color.grey.500}" },
      "text-on-accent": { "$type": "color", "$value": "{color.white}" },
      "accent":         { "$type": "color", "$value": "{color.blue.600}" },
      "accent-hover":   { "$type": "color", "$value": "{color.blue.700}" },
      "accent-subtle":  { "$type": "color", "$value": "{color.blue.100}" },
      "accent-text":    { "$type": "color", "$value": "{color.blue.800}" },
      "focus-ring":     { "$type": "color", "$value": "{color.blue.500}" },
      "success":        { "$type": "color", "$value": "{color.green.600}" },
      "warning":        { "$type": "color", "$value": "{color.amber.600}" },
      "danger":         { "$type": "color", "$value": "{color.red.600}" },
      "seal":           { "$type": "color", "$value": "{color.violet.600}" }
    }
  }
}
```

### 2.2 Dark

```json
{
  "semantic": {
    "dark": {
      "bg-canvas":      { "$type": "color", "$value": "{color.grey.950}" },
      "bg-surface":     { "$type": "color", "$value": "{color.grey.925}" },
      "bg-raised":      { "$type": "color", "$value": "{color.grey.850}" },
      "bg-subtle":      { "$type": "color", "$value": "{color.grey.875}" },
      "border-default": { "$type": "color", "$value": "{color.grey.800}" },
      "border-strong":  { "$type": "color", "$value": "{color.grey.600}" },
      "text-primary":   { "$type": "color", "$value": "#F0F2F5" },
      "text-secondary": { "$type": "color", "$value": "#B4BCC9" },
      "text-muted":     { "$type": "color", "$value": "{color.grey.400}" },
      "text-on-accent": { "$type": "color", "$value": "{color.grey.950}" },
      "accent":         { "$type": "color", "$value": "{color.blue.400}" },
      "accent-hover":   { "$type": "color", "$value": "{color.blue.350}" },
      "accent-subtle":  { "$type": "color", "$value": "{color.blue.950}" },
      "accent-text":    { "$type": "color", "$value": "{color.blue.300}" },
      "focus-ring":     { "$type": "color", "$value": "{color.blue.400}" },
      "success":        { "$type": "color", "$value": "{color.green.400}" },
      "warning":        { "$type": "color", "$value": "{color.amber.400}" },
      "danger":         { "$type": "color", "$value": "{color.red.400}" },
      "seal":           { "$type": "color", "$value": "{color.violet.400}" }
    }
  }
}
```

## 3. Spacing

```json
{
  "space": {
    "0":  { "$type": "dimension", "$value": "0rem" },
    "1":  { "$type": "dimension", "$value": "0.25rem" },
    "2":  { "$type": "dimension", "$value": "0.5rem" },
    "3":  { "$type": "dimension", "$value": "0.75rem" },
    "4":  { "$type": "dimension", "$value": "1rem" },
    "5":  { "$type": "dimension", "$value": "1.25rem" },
    "6":  { "$type": "dimension", "$value": "1.5rem" },
    "8":  { "$type": "dimension", "$value": "2rem" },
    "10": { "$type": "dimension", "$value": "2.5rem" },
    "12": { "$type": "dimension", "$value": "3rem" },
    "16": { "$type": "dimension", "$value": "4rem" },
    "20": { "$type": "dimension", "$value": "5rem" },
    "24": { "$type": "dimension", "$value": "6rem" }
  }
}
```

## 4. Radii (continuous, Apple-like)

```json
{
  "radius": {
    "xs":   { "$type": "dimension", "$value": "0.375rem" },
    "sm":   { "$type": "dimension", "$value": "0.5rem" },
    "md":   { "$type": "dimension", "$value": "0.625rem" },
    "lg":   { "$type": "dimension", "$value": "0.875rem" },
    "xl":   { "$type": "dimension", "$value": "1.25rem" },
    "2xl":  { "$type": "dimension", "$value": "1.75rem" },
    "full": { "$type": "dimension", "$value": "9999px" }
  }
}
```

(md = 10px buttons/inputs · lg = 14px cards · xl = 20px modals — matches design-system.md §5.)

## 5. Typography

```json
{
  "font": {
    "family": {
      "sans": { "$type": "fontFamily", "$value": ["Inter Variable", "Inter", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] },
      "mono": { "$type": "fontFamily", "$value": ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"] }
    },
    "weight": {
      "regular":  { "$type": "fontWeight", "$value": 400 },
      "medium":   { "$type": "fontWeight", "$value": 500 },
      "semibold": { "$type": "fontWeight", "$value": 600 },
      "display":  { "$type": "fontWeight", "$value": 650 }
    },
    "size": {
      "caption": { "$type": "dimension", "$value": "0.75rem" },
      "body-sm": { "$type": "dimension", "$value": "0.875rem" },
      "body":    { "$type": "dimension", "$value": "1rem" },
      "body-lg": { "$type": "dimension", "$value": "1.125rem" },
      "h4":      { "$type": "dimension", "$value": "1.125rem" },
      "h3":      { "$type": "dimension", "$value": "1.25rem" },
      "h2":      { "$type": "dimension", "$value": "1.5rem" },
      "h1":      { "$type": "dimension", "$value": "2.25rem" },
      "display": { "$type": "dimension", "$value": "3rem" }
    },
    "lineHeight": {
      "tight":   { "$type": "number", "$value": 1.1 },
      "heading": { "$type": "number", "$value": 1.2 },
      "snug":    { "$type": "number", "$value": 1.3 },
      "compact": { "$type": "number", "$value": 1.4 },
      "body":    { "$type": "number", "$value": 1.5 },
      "relaxed": { "$type": "number", "$value": 1.6 }
    },
    "tracking": {
      "tighter": { "$type": "dimension", "$value": "-0.02em" },
      "tight":   { "$type": "dimension", "$value": "-0.01em" },
      "normal":  { "$type": "dimension", "$value": "0em" },
      "caption": { "$type": "dimension", "$value": "0.01em" },
      "overline":{ "$type": "dimension", "$value": "0.06em" }
    }
  }
}
```

## 6. Shadows, motion, z-index, breakpoints

```json
{
  "shadow": {
    "sm": { "$type": "shadow", "$value": [
      { "color": "#10182814", "offsetX": "0px", "offsetY": "1px", "blur": "2px", "spread": "0px" }
    ]},
    "md": { "$type": "shadow", "$value": [
      { "color": "#1018280F", "offsetX": "0px", "offsetY": "4px", "blur": "8px",  "spread": "-2px" },
      { "color": "#10182814", "offsetX": "0px", "offsetY": "2px", "blur": "4px",  "spread": "-2px" }
    ]},
    "lg": { "$type": "shadow", "$value": [
      { "color": "#10182814", "offsetX": "0px", "offsetY": "12px", "blur": "24px", "spread": "-4px" },
      { "color": "#1018280A", "offsetX": "0px", "offsetY": "4px",  "blur": "8px",  "spread": "-2px" }
    ]}
  },
  "motion": {
    "duration": {
      "micro":      { "$type": "duration", "$value": "150ms" },
      "standard":   { "$type": "duration", "$value": "200ms" },
      "emphasised": { "$type": "duration", "$value": "250ms" },
      "max":        { "$type": "duration", "$value": "300ms" }
    },
    "easing": {
      "out":      { "$type": "cubicBezier", "$value": [0.2, 0, 0, 1] },
      "in":       { "$type": "cubicBezier", "$value": [0.4, 0, 1, 1] },
      "standard": { "$type": "cubicBezier", "$value": [0.25, 0.1, 0.25, 1] }
    }
  },
  "zIndex": {
    "dropdown": { "$type": "number", "$value": 1000 },
    "sticky":   { "$type": "number", "$value": 1100 },
    "overlay":  { "$type": "number", "$value": 1300 },
    "modal":    { "$type": "number", "$value": 1400 },
    "popover":  { "$type": "number", "$value": 1500 },
    "toast":    { "$type": "number", "$value": 1600 },
    "tooltip":  { "$type": "number", "$value": 1700 }
  },
  "breakpoint": {
    "sm":  { "$type": "dimension", "$value": "640px" },
    "md":  { "$type": "dimension", "$value": "768px" },
    "lg":  { "$type": "dimension", "$value": "1024px" },
    "xl":  { "$type": "dimension", "$value": "1280px" },
    "2xl": { "$type": "dimension", "$value": "1536px" }
  }
}
```

Dark-mode shadows: same offsets/blur with colour `#00000066` (sm), `#00000080` (md/lg) — dark surfaces rely primarily on elevation colour (`bg-raised`), not shadow.

---

## 7. Overlay & special values

| Token | Value | Use |
|---|---|---|
| `overlay-scrim` | `#101828` @ 60% (`#10182899`) | modal backdrop, blur 4px |
| `focus-ring-width` | 2px | + 2px offset |
| `target-min` | 24px | WCAG 2.2 §2.5.8 |
| `target-touch` | 44px | primary mobile actions |

---

## 8. Tailwind 4 `@theme` mapping

Lives in `packages/design-tokens/src/theme.css`, imported by `apps/web/src/app/globals.css`. Semantic tokens are exposed as CSS variables that flip under `.dark`; Tailwind utilities reference the semantic layer only — components never use primitive scales directly.

```css
@import "tailwindcss";

@theme {
  /* ---- primitives ---- */
  --color-white: #FFFFFF;
  --color-grey-25: #F7F8FA;  --color-grey-50: #F2F4F7;  --color-grey-100: #E4E7EC;
  --color-grey-200: #D0D5DD; --color-grey-300: #98A2B3; --color-grey-400: #8B94A6;
  --color-grey-500: #6C7689; --color-grey-600: #5D6B82; --color-grey-700: #4A5468;
  --color-grey-800: #2A303C; --color-grey-850: #1F242E; --color-grey-875: #1C212A;
  --color-grey-900: #1D2433; --color-grey-925: #171B22; --color-grey-950: #0E1116;
  --color-blue-50: #F2F7FC;  --color-blue-100: #E3EEF9; --color-blue-200: #C4DDF2;
  --color-blue-300: #9CC5E8; --color-blue-350: #8FBCE5; --color-blue-400: #6BA7DB;
  --color-blue-500: #4288C8; --color-blue-600: #2F6EAD; --color-blue-700: #275C91;
  --color-blue-800: #224C77; --color-blue-900: #1E4062; --color-blue-950: #1D3049;
  --color-green-400: #4CC38A; --color-green-600: #1B7F4D;
  --color-amber-400: #E5A13D; --color-amber-600: #A15C07;
  --color-red-400: #F2716A;   --color-red-600: #B42318;
  --color-violet-400: #A79BE8; --color-violet-600: #5B4FB0;

  /* ---- semantic (light defaults; utilities bind to these) ---- */
  --color-canvas: var(--color-grey-25);
  --color-surface: var(--color-white);
  --color-raised: var(--color-white);
  --color-subtle: var(--color-grey-50);
  --color-border: var(--color-grey-100);
  --color-border-strong: var(--color-grey-300);
  --color-fg: var(--color-grey-900);
  --color-fg-secondary: var(--color-grey-700);
  --color-fg-muted: var(--color-grey-500);
  --color-on-accent: var(--color-white);
  --color-accent: var(--color-blue-600);
  --color-accent-hover: var(--color-blue-700);
  --color-accent-subtle: var(--color-blue-100);
  --color-accent-text: var(--color-blue-800);
  --color-focus: var(--color-blue-500);
  --color-success: var(--color-green-600);
  --color-warning: var(--color-amber-600);
  --color-danger: var(--color-red-600);
  --color-seal: var(--color-violet-600);

  /* ---- type ---- */
  --font-sans: "Inter Variable", Inter, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", SFMono-Regular, Consolas, monospace;
  --text-caption: 0.75rem;  --text-body-sm: 0.875rem; --text-body: 1rem;
  --text-body-lg: 1.125rem; --text-h4: 1.125rem;      --text-h3: 1.25rem;
  --text-h2: 1.5rem;        --text-h1: 2.25rem;       --text-display: 3rem;
  --font-weight-display: 650;

  /* ---- spacing (Tailwind 4 derives spacing utilities from this base) ---- */
  --spacing: 0.25rem;

  /* ---- radii ---- */
  --radius-xs: 0.375rem; --radius-sm: 0.5rem;  --radius-md: 0.625rem;
  --radius-lg: 0.875rem; --radius-xl: 1.25rem; --radius-2xl: 1.75rem;

  /* ---- shadows ---- */
  --shadow-sm: 0 1px 2px 0 #10182814;
  --shadow-md: 0 4px 8px -2px #1018280F, 0 2px 4px -2px #10182814;
  --shadow-lg: 0 12px 24px -4px #10182814, 0 4px 8px -2px #1018280A;

  /* ---- motion ---- */
  --duration-micro: 150ms; --duration-standard: 200ms;
  --duration-emphasised: 250ms; --duration-max: 300ms;
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-standard: cubic-bezier(0.25, 0.1, 0.25, 1);

  /* ---- z-index ---- */
  --z-dropdown: 1000; --z-sticky: 1100; --z-overlay: 1300; --z-modal: 1400;
  --z-popover: 1500; --z-toast: 1600; --z-tooltip: 1700;

  /* ---- breakpoints ---- */
  --breakpoint-sm: 640px; --breakpoint-md: 768px; --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px; --breakpoint-2xl: 1536px;
}

/* Dark theme: flips semantic variables only */
.dark {
  --color-canvas: var(--color-grey-950);
  --color-surface: var(--color-grey-925);
  --color-raised: var(--color-grey-850);
  --color-subtle: var(--color-grey-875);
  --color-border: var(--color-grey-800);
  --color-border-strong: var(--color-grey-600);
  --color-fg: #F0F2F5;
  --color-fg-secondary: #B4BCC9;
  --color-fg-muted: var(--color-grey-400);
  --color-on-accent: var(--color-grey-950);
  --color-accent: var(--color-blue-400);
  --color-accent-hover: var(--color-blue-350);
  --color-accent-subtle: var(--color-blue-950);
  --color-accent-text: var(--color-blue-300);
  --color-focus: var(--color-blue-400);
  --color-success: var(--color-green-400);
  --color-warning: var(--color-amber-400);
  --color-danger: var(--color-red-400);
  --color-seal: var(--color-violet-400);
  --shadow-sm: 0 1px 2px 0 #00000066;
  --shadow-md: 0 4px 8px -2px #00000080, 0 2px 4px -2px #00000080;
  --shadow-lg: 0 12px 24px -4px #00000080, 0 4px 8px -2px #00000066;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-micro: 0ms; --duration-standard: 0ms;
    --duration-emphasised: 0ms; --duration-max: 0ms;
  }
}
```

### Usage rules

1. Components consume semantic utilities only (`bg-surface`, `text-fg-muted`, `border-border-strong`); primitive scales (`blue-600`) are reserved for the token layer itself.
2. Any new colour requires a token PR touching **both** this file and `design-system.md` §4 (checked in code review — see coding-standards.md).
3. Token package publishes JSON (this doc), CSS (`theme.css`), and a typed TS export for email templates and PDF/seal rendering.
