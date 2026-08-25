/** Cursor pagination primitives (PROJECT_MEMORY §8: cursor pagination). */
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export interface PageQuery {
  limit: number;
  cursor?: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/** Clamp a requested limit into [1, MAX_PAGE_LIMIT], defaulting when absent. */
export function clampLimit(requested?: number): number {
  if (requested === undefined || Number.isNaN(requested)) return DEFAULT_PAGE_LIMIT;
  return Math.min(Math.max(1, Math.trunc(requested)), MAX_PAGE_LIMIT);
}

/** Opaque, URL-safe cursor encoding (base64url). Not encryption — do not put secrets here. */
export function encodeCursor(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}

/** Build a page from a page-sized+1 fetch: the extra row signals more pages. */
export function toCursorPage<T>(
  rows: T[],
  limit: number,
  cursorOf: (item: T) => string,
): CursorPage<T> {
  if (rows.length <= limit) {
    return { items: rows, nextCursor: null };
  }
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return { items, nextCursor: last !== undefined ? encodeCursor(cursorOf(last)) : null };
}
