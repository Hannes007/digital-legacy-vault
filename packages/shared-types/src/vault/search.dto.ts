import type { DocumentType } from '../common/document-type.js';

/** One hit from Postgres full-text metadata search. */
export interface DocumentSearchResult {
  documentId: string;
  title: string;
  type: DocumentType;
  /** ts_headline snippet with matched terms marked. */
  snippet: string;
  /** ts_rank relevance score. */
  rank: number;
}
