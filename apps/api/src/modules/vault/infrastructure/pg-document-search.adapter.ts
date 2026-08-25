import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { DocumentSearchPort, SearchHit } from '../application/ports';

interface Row {
  documentId: string;
  title: string;
  type: string;
  snippet: string;
  rank: number;
}

// Parameterised ($1..$3) — no string interpolation, so no SQL injection.
const SQL = `
  SELECT d.id AS "documentId", d.title, d.type,
         ts_headline('english', d.title, plainto_tsquery('english', $1)) AS snippet,
         ts_rank(d.search_vector, plainto_tsquery('english', $1)) AS rank
  FROM documents d
  WHERE d.owner_id = $2::uuid
    AND d.search_vector @@ plainto_tsquery('english', $1)
  ORDER BY rank DESC
  LIMIT $3
`;

/** Postgres full-text metadata search (roadmap §3: Postgres FTS first). */
@Injectable()
export class PgDocumentSearchAdapter implements DocumentSearchPort {
  constructor(private readonly prisma: PrismaService) {}

  async search(ownerId: string, query: string, limit: number): Promise<SearchHit[]> {
    const rows = (await this.prisma.$queryRawUnsafe(SQL, query, ownerId, limit)) as Row[];
    return rows.map((r) => ({
      documentId: r.documentId,
      title: r.title,
      type: r.type,
      snippet: r.snippet,
      rank: Number(r.rank),
    }));
  }
}
