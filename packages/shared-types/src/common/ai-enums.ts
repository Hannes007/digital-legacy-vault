/**
 * AI bounded-context enums (Phase 7, PROJECT_MEMORY §2.8).
 *
 * `AiFeature` labels every AI telemetry row so cost-per-request budgets can be
 * instrumented per capability (roadmap Phase 7 exit criteria).
 */
export enum AiFeature {
  /** Document classification / auto-categorisation. */
  CLASSIFICATION = 'CLASSIFICATION',
  /** Document summarisation. */
  SUMMARY = 'SUMMARY',
  /** Natural-language search query interpretation. */
  SEARCH = 'SEARCH',
  /** Estate completeness recommendations (rule-based, cost 0). */
  RECOMMENDATION = 'RECOMMENDATION',
}
