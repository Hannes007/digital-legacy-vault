import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { NlSearchService } from './nl-search.service';

import type { AiPreferenceService } from './ai-preference.service';
import type { AiUsageService } from './ai-usage.service';
import type { AiGateway, AiSearchHit, AiSearchPort, RecordUsageInput } from './ports';

function harness(opts: { aiEnabled?: boolean; keywords?: string[] } = {}) {
  const telemetry: RecordUsageInput[] = [];
  const searched: Array<{ ownerId: string; query: string; limit: number }> = [];
  const hits: AiSearchHit[] = [
    { documentId: 'd1', title: 'Life policy', type: 'INSURANCE', rank: 0.9, snippet: null },
  ];
  const gateway: AiGateway = {
    classify: async () => { throw new Error('unused'); },
    summarise: async () => { throw new Error('unused'); },
    extractKeywords: async () => ({ keywords: opts.keywords ?? ['life', 'insurance'], inputTokens: 5, outputTokens: 3, model: 'dev-heuristic' }),
  };
  const search: AiSearchPort = {
    search: async (ownerId, query, limit) => {
      searched.push({ ownerId, query, limit });
      return hits;
    },
  };
  const preferences = {
    assertEnabled: async () => {
      if (opts.aiEnabled === false) throw new ForbiddenException('AI off');
    },
  } as unknown as AiPreferenceService;
  const usage = {
    assertWithinDailyCap: async () => undefined,
    record: async (input: RecordUsageInput) => { telemetry.push(input); },
  } as unknown as AiUsageService;
  const svc = new NlSearchService(gateway, search, preferences, usage);
  return { svc, telemetry, searched };
}

describe('NlSearchService (Phase 7)', () => {
  it('interprets the query into keywords and searches with them', async () => {
    const h = harness();
    const result = await h.svc.query('u1', 'do I have life insurance?', 5);
    expect(result.keywords).toStrictEqual(['life', 'insurance']);
    expect(h.searched).toStrictEqual([{ ownerId: 'u1', query: 'life insurance', limit: 5 }]);
    expect(result.hits).toHaveLength(1);
    expect(h.telemetry.map((t) => t.feature)).toStrictEqual(['SEARCH']);
    expect(h.telemetry[0]?.documentId).toBeNull();
  });

  it('falls back to the raw query when no keywords are extracted', async () => {
    const h = harness({ keywords: [] });
    await h.svc.query('u1', 'policy', undefined);
    expect(h.searched[0]?.query).toBe('policy');
    expect(h.searched[0]?.limit).toBe(10);
  });

  it('rejects empty/oversized queries and honours the opt-out', async () => {
    const h = harness();
    await expect(h.svc.query('u1', '   ', undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(h.svc.query('u1', 'x'.repeat(501), undefined)).rejects.toBeInstanceOf(BadRequestException);
    const off = harness({ aiEnabled: false });
    await expect(off.svc.query('u1', 'wills', undefined)).rejects.toBeInstanceOf(ForbiddenException);
    expect(off.telemetry).toHaveLength(0);
  });
});
