import { Injectable } from '@nestjs/common';

import type { WebhookTransport, WebhookTransportResult } from '../application/ports';

/**
 * Outbound webhook HTTP transport (Phase 8). 2xx = delivered; anything else
 * (including timeouts and network errors) is a retryable failure. SSRF note:
 * destinations are HTTPS-only (validated at registration); private-range IP
 * blocking is enforced at the egress NetworkPolicy layer in-cluster.
 */
@Injectable()
export class FetchWebhookTransport implements WebhookTransport {
  async post(
    url: string,
    body: string,
    headers: Record<string, string>,
    timeoutMs: number,
  ): Promise<WebhookTransportResult> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      return { ok: res.ok, status: res.status };
    } catch (error) {
      return { ok: false, status: null, error: String(error) };
    }
  }
}
