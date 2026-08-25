/**
 * Deterministic JSON serialisation for hash chaining.
 *
 * Object keys are emitted in sorted order at every depth so the same logical
 * value always produces byte-identical output — a prerequisite for a verifiable
 * audit hash chain (phase-2-contracts: `event_hash = sha256Hex(prev + canon)`).
 * `undefined` properties are omitted; arrays keep their order.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) {
        sorted[key] = sortValue(source[key]);
      }
    }
    return sorted;
  }
  return value;
}
