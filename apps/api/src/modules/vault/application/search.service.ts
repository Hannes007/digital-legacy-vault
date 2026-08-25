import { Inject, Injectable } from '@nestjs/common';

import type { DocumentSearchResult, DocumentType } from '@dlv/shared-types';

import { DOCUMENT_SEARCH_PORT, type DocumentSearchPort } from './ports';

/** Metadata search over the owner's documents (Postgres FTS first, roadmap §3). */
@Injectable()
export class SearchService {
  constructor(@Inject(DOCUMENT_SEARCH_PORT) private readonly search_: DocumentSearchPort) {}

  async search(ownerId: string, query: string, limit = 20): Promise<DocumentSearchResult[]> {
    const q = query.trim();
    if (q.length === 0) return [];
    const hits = await this.search_.search(ownerId, q, Math.min(Math.max(limit, 1), 50));
    return hits.map((h) => ({
      documentId: h.documentId,
      title: h.title,
      type: h.type as DocumentType,
      snippet: h.snippet,
      rank: h.rank,
    }));
  }
}
