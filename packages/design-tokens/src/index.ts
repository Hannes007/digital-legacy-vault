/**
 * Digital Legacy Vault — design tokens (typed).
 *
 * The W3C DTCG source of truth is `src/tokens.dtcg.json`; the Tailwind 4
 * `@theme` layer is `theme.css`. This module exposes the resolved values as
 * typed, `as const` objects for programmatic use (charts, canvas, emails).
 * Components should prefer Tailwind utilities bound to the semantic layer;
 * reach for these constants only where CSS classes are not available.
 */

export const primitives = {
  white: '#FFFFFF',
  grey: {
    25: '#F7F8FA', 50: '#F2F4F7', 100: '#E4E7EC', 200: '#D0D5DD',
    300: '#98A2B3', 400: '#8B94A6', 500: '#6C7689', 600: '#5D6B82',
    700: '#4A5468', 800: '#2A303C', 850: '#1F242E', 875: '#1C212A',
    900: '#1D2433', 925: '#171B22', 950: '#0E1116',
  },
  blue: {
    50: '#F2F7FC', 100: '#E3EEF9', 200: '#C4DDF2', 300: '#9CC5E8',
    350: '#8FBCE5', 400: '#6BA7DB', 500: '#4288C8', 600: '#2F6EAD',
    700: '#275C91', 800: '#224C77', 900: '#1E4062', 950: '#1D3049',
  },
  green: { 400: '#4CC38A', 600: '#1B7F4D' },
  amber: { 400: '#E5A13D', 600: '#A15C07' },
  red: { 400: '#F2716A', 600: '#B42318' },
  violet: { 400: '#A79BE8', 600: '#5B4FB0' },
  overlay: '#101828',
} as const;

/** Semantic aliases per colour scheme (values resolved from primitives). */
export const semantic = {
  light: {
    canvas: primitives.grey[25],
    surface: primitives.white,
    raised: primitives.white,
    subtle: primitives.grey[50],
    border: primitives.grey[100],
    borderStrong: primitives.grey[300],
    fg: primitives.grey[900],
    fgSecondary: primitives.grey[700],
    fgMuted: primitives.grey[500],
    onAccent: primitives.white,
    accent: primitives.blue[600],
    accentHover: primitives.blue[700],
    accentSubtle: primitives.blue[100],
    accentText: primitives.blue[800],
    focus: primitives.blue[500],
    success: primitives.green[600],
    warning: primitives.amber[600],
    danger: primitives.red[600],
    seal: primitives.violet[600],
  },
  dark: {
    canvas: primitives.grey[950],
    surface: primitives.grey[925],
    raised: primitives.grey[850],
    subtle: primitives.grey[875],
    border: primitives.grey[800],
    borderStrong: primitives.grey[600],
    fg: '#F0F2F5',
    fgSecondary: '#B4BCC9',
    fgMuted: primitives.grey[400],
    onAccent: primitives.grey[950],
    accent: primitives.blue[400],
    accentHover: primitives.blue[350],
    accentSubtle: primitives.blue[950],
    accentText: primitives.blue[300],
    focus: primitives.blue[400],
    success: primitives.green[400],
    warning: primitives.amber[400],
    danger: primitives.red[400],
    seal: primitives.violet[400],
  },
} as const;

export const space = {
  0: '0rem', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem',
  5: '1.25rem', 6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem',
  16: '4rem', 20: '5rem', 24: '6rem',
} as const;

export const radius = {
  xs: '0.375rem', sm: '0.5rem', md: '0.625rem', lg: '0.875rem',
  xl: '1.25rem', '2xl': '1.75rem', full: '9999px',
} as const;

export const font = {
  family: {
    sans: ['Inter Variable', 'Inter', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
  },
  weight: { regular: 400, medium: 500, semibold: 600, display: 650 },
  size: {
    caption: '0.75rem', 'body-sm': '0.875rem', body: '1rem', 'body-lg': '1.125rem',
    h4: '1.125rem', h3: '1.25rem', h2: '1.5rem', h1: '2.25rem', display: '3rem',
  },
  lineHeight: { tight: 1.1, heading: 1.2, snug: 1.3, compact: 1.4, body: 1.5, relaxed: 1.6 },
  tracking: { tighter: '-0.02em', tight: '-0.01em', normal: '0em', caption: '0.01em', overline: '0.06em' },
} as const;

export const motion = {
  duration: { micro: '150ms', standard: '200ms', emphasised: '250ms', max: '300ms' },
  easing: {
    out: 'cubic-bezier(0.2, 0, 0, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    standard: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
} as const;

export const zIndex = {
  dropdown: 1000, sticky: 1100, overlay: 1300, modal: 1400,
  popover: 1500, toast: 1600, tooltip: 1700,
} as const;

export const breakpoint = {
  sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
} as const;

export const overlay = {
  scrim: '#10182899', // #101828 @ 60%
  focusRingWidth: '2px',
  targetMin: '24px',
  targetTouch: '44px',
} as const;

export type ColorScheme = keyof typeof semantic;
export type SemanticToken = keyof typeof semantic.light;

export const tokens = {
  primitives, semantic, space, radius, font, motion, zIndex, breakpoint, overlay,
} as const;

export default tokens;
