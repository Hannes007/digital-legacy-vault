import type { Env } from '@dlv/config';
import type { HelmetOptions } from 'helmet';

/**
 * Security-header policy (Phase 9 hardening) — encodes security-architecture.md
 * §HTTP-headers so runtime matches the documented posture, rather than relying
 * on Helmet's generic defaults.
 *
 * CSP mirrors the documented directives: self-only by default; Stripe allowed
 * for scripts/frames; images from self/data/blob + the CDN; connect to the API
 * and Stripe. Scripts avoid `unsafe-inline` (the Next.js app ships hashed/nonced
 * bundles in production). HSTS is gated on {@link Env.HSTS_ENABLED} so local
 * http development is unaffected while staging/prod send a 2-year preload header.
 */
export function helmetOptions(env: Env): HelmetOptions {
  const api = new URL(env.WEB_BASE_URL).origin;
  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://js.stripe.com'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https://*.dlv-cdn.example'],
        'font-src': ["'self'"],
        'connect-src': ["'self'", api, 'https://api.stripe.com'],
        'frame-src': ['https://js.stripe.com'],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': [],
      },
    },
    // Sent only over TLS environments; 2 years + subdomains + preload (§headers).
    strictTransportSecurity: env.HSTS_ENABLED
      ? { maxAge: 63_072_000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // The refresh cookie is same-site; deny cross-origin embedding entirely.
    xFrameOptions: { action: 'deny' },
    xContentTypeOptions: true,
    // Isolate the API origin (defence against Spectre-style cross-origin reads).
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  };
}

/**
 * Builds the CORS origin allow-list: always the web app, plus any extra origins
 * from {@link Env.CORS_ALLOWED_ORIGINS} (comma-separated). Returns an origin
 * predicate that denies by default — no wildcard, credentials are enabled.
 */
export function corsOrigins(env: Env): string[] {
  const extra = env.CORS_ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  return [...new Set([env.WEB_BASE_URL, ...extra])];
}
