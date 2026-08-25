import type { Request } from 'express';

/** Coarse request metadata captured for sessions and the audit trail. */
export interface RequestContext {
  /** Best-effort client IP (may be a proxy address if trust proxy is off). */
  ip: string;
  /** Privacy-masked IP safe for storage and API responses. */
  ipMasked: string;
  /** Raw User-Agent header (truncated). */
  userAgent: string;
  /** Human-friendly device label derived from the User-Agent. */
  deviceLabel: string;
}

const MAX_UA_LENGTH = 400;

/**
 * Masks an IP for privacy (PROJECT_MEMORY: no full IPs in API responses).
 * IPv4 keeps the first two octets (`102.65.x.x`); IPv6 keeps the first two
 * hextets (`2001:db8:x`). Unknown shapes collapse to `x.x.x.x`.
 */
export function maskIp(ip: string): string {
  const cleaned = ip.replace(/^::ffff:/, ''); // unwrap IPv4-mapped IPv6
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 4) {
      return `${parts[0] ?? 'x'}.${parts[1] ?? 'x'}.x.x`;
    }
  }
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    return `${parts[0] ?? 'x'}:${parts[1] ?? 'x'}:x`;
  }
  return 'x.x.x.x';
}

/**
 * Derives a short device label from a User-Agent string, e.g.
 * `Chrome on Windows`. Intentionally coarse — enough for a human to recognise a
 * session in a list, never a fingerprint.
 */
export function deviceLabelFromUserAgent(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  const browser = ua.includes('edg/')
    ? 'Edge'
    : ua.includes('chrome/') && !ua.includes('chromium')
      ? 'Chrome'
      : ua.includes('firefox/')
        ? 'Firefox'
        : ua.includes('safari/') && !ua.includes('chrome/')
          ? 'Safari'
          : 'Unknown browser';
  const os = ua.includes('windows')
    ? 'Windows'
    : ua.includes('mac os') || ua.includes('macintosh')
      ? 'macOS'
      : ua.includes('android')
        ? 'Android'
        : ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')
          ? 'iOS'
          : ua.includes('linux')
            ? 'Linux'
            : 'unknown OS';
  return `${browser} on ${os}`;
}

/** Extracts a {@link RequestContext} from an Express request. */
export function extractRequestContext(req: Request): RequestContext {
  const ip: string = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const uaHeader = req.headers['user-agent'];
  const userAgent: string = (typeof uaHeader === 'string' ? uaHeader : '').slice(0, MAX_UA_LENGTH);
  return {
    ip,
    ipMasked: maskIp(ip),
    userAgent,
    deviceLabel: deviceLabelFromUserAgent(userAgent),
  };
}
