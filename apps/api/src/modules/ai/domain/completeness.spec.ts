import { DocumentType } from '@dlv/shared-types';

import { computeCompleteness } from './completeness';

describe('completeness rules (Phase 7 recommendations)', () => {
  it('recommends all essentials for an empty vault with score 0', () => {
    const report = computeCompleteness([]);
    expect(report.score).toBe(0);
    expect(report.recommendations.length).toBe(8);
  });

  it('gives the contextual "will but no medical directive" nudge', () => {
    const report = computeCompleteness([DocumentType.LAST_WILL]);
    const directive = report.recommendations.find((r) => r.type === DocumentType.MEDICAL_DIRECTIVE);
    expect(directive?.reason).toContain('You have a will but no medical directive');
  });

  it('scores 100 with no recommendations when all essentials are present', () => {
    const report = computeCompleteness([
      DocumentType.LAST_WILL,
      DocumentType.MEDICAL_DIRECTIVE,
      DocumentType.POWER_OF_ATTORNEY,
      DocumentType.LIVING_WILL,
      DocumentType.INSURANCE,
      DocumentType.FUNERAL_INSTRUCTIONS,
      DocumentType.EMERGENCY_CONTACTS,
      DocumentType.IDENTITY_DOCUMENT,
    ]);
    expect(report.score).toBe(100);
    expect(report.recommendations).toHaveLength(0);
  });

  it('ignores non-essential types for the score but keeps them in presentTypes', () => {
    const report = computeCompleteness([DocumentType.TAX, DocumentType.PASSPORT]);
    expect(report.score).toBe(0);
    expect(report.presentTypes).toStrictEqual([DocumentType.PASSPORT, DocumentType.TAX]);
  });
});
