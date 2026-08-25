import { AiFeature } from '@dlv/shared-types';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { estimateCostMicroUsd } from '../domain/cost';

import { AiPreferenceService } from './ai-preference.service';
import { AiUsageService } from './ai-usage.service';
import { AI_GATEWAY, AI_SEARCH_PORT } from './ports';

import type { AiGateway, AiSearchPort } from './ports';
import type { AiSearchResultDto } from '@dlv/shared-types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;
const MAX_QUERY_CHARS = 500;

/**
 * Natural-language search (Phase 7): the gateway interprets the query into
 * FTS keywords; retrieval runs on Postgres FTS restricted at the SQL level to
 * STANDARD vaults, so client-encrypted objects can never surface. The query
 * itself is user-typed input, never vault content.
 */
@Injectable()
export class NlSearchService {
  constructor(
    @Inject(AI_GATEWAY) private readonly gateway: AiGateway,
    @Inject(AI_SEARCH_PORT) private readonly search: AiSearchPort,
    private readonly preferences: AiPreferenceService,
    private readonly usage: AiUsageService,
  ) {}

  async query(userId: string, rawQuery: string, limit?: number): Promise<AiSearchResultDto> {
    const query = rawQuery.trim();
    if (query.length === 0) throw new BadRequestException('Enter a search query.');
    if (query.length > MAX_QUERY_CHARS) {
      throw new BadRequestException(`Queries are limited to ${String(MAX_QUERY_CHARS)} characters.`);
    }
    await this.preferences.assertEnabled(userId);
    await this.usage.assertWithinDailyCap(userId);

    const effectiveLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const interpreted = await this.gateway.extractKeywords(query);
    const ftsQuery = interpreted.keywords.length > 0 ? interpreted.keywords.join(' ') : query;
    const hits = await this.search.search(userId, ftsQuery, effectiveLimit);

    await this.usage.record({
      userId,
      feature: AiFeature.SEARCH,
      documentId: null,
      model: interpreted.model,
      inputTokens: interpreted.inputTokens,
      outputTokens: interpreted.outputTokens,
      costMicroUsd: estimateCostMicroUsd(interpreted.model, interpreted),
    });

    return { interpretedQuery: ftsQuery, keywords: interpreted.keywords, hits };
  }
}
