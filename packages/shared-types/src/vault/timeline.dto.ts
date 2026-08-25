/** A single entry in a document's activity timeline (audit context, hash chain). */
export interface TimelineEntryDto {
  id: string;
  occurredAt: string;
  eventType: string;
  actorUserId: string | null;
  resource: string;
  summary: string;
  /** SHA-256 of this event (chain link) for independent verification (§7.4). */
  eventHash: string;
}
