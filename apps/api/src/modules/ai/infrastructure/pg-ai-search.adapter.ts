import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { AiSearchHit, AiSearchPort } from '../application/ports';

interface Row {
  documentId: string;
  title: string;
  type: string;
  snippet: string | null;
  rank: number;
}

// Parameterised ($1..$3) — no string interpolation, so no SQL injection.
// The `v.kind = 'STANDARD'` predicate is the SQL-level half of the Phase 7
// client-encrypted exclusion: AI search can never surface a document from a
// client-encrypted vault, whatever the FTS index contains.
const SQL = `
  SELECT d.id AS "documentId", d.title, d.type,
         ts_headline('english', d.title, plainto_tsquery('english', $1)) AS snippet,
         ts_rank(d.search_vector, plainto_tsquery('english', $1)) AS rank
  FROM documents d
  JOIN vaults v ON v.id = d.vault_id
  WHERE d.owner_id = $2::uuid
    AND v.kind = 'STANDARD'
    AND d.search_vector @@ plainto_tsquery('english', $1)
  ORDER BY rank DESC
  LIMIT $3
`;

/** STANDARD-vault-only Postgres FTS behind the AI search port (Phase 7). */
@Injectable()
export class PgAiSearchAdapter implements AiSearchPort {
  constructor(private readonly prisma: PrismaService) {}

  async search(ownerId: string, query: string, limit: number): Promise<AiSearchHit[]> {
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
