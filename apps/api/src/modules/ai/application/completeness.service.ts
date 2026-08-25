import { AiFeature, DocumentType } from '@dlv/shared-types';
import { Inject, Injectable } from '@nestjs/common';

import { computeCompleteness } from '../domain/completeness';

import { AiPreferenceService } from './ai-preference.service';
import { AiUsageService } from './ai-usage.service';
import { AI_TEXT_SOURCE } from './ports';

import type { AiTextSource } from './ports';
import type { CompletenessReportDto } from '@dlv/shared-types';

const RULES_MODEL = 'rules/completeness-v1';

/**
 * Estate completeness recommendations (Phase 7): pure domain rules over the
 * user's STANDARD-vault document types — no model call, so the telemetry row
 * carries zero tokens and zero cost. Client-encrypted items never enter the
 * type inventory (excluded at the SQL source).
 */
@Injectable()
export class CompletenessService {
  constructor(
    @Inject(AI_TEXT_SOURCE) private readonly textSource: AiTextSource,
    private readonly preferences: AiPreferenceService,
    private readonly usage: AiUsageService,
  ) {}

  async report(userId: string): Promise<CompletenessReportDto> {
    await this.preferences.assertEnabled(userId);

    const rawTypes = await this.textSource.listOwnerDocumentTypes(userId);
    const known = new Set(Object.values(DocumentType) as string[]);
    const present = rawTypes.filter((t): t is DocumentType => known.has(t));

    const report = computeCompleteness(present);
    await this.usage.record({
      userId,
      feature: AiFeature.RECOMMENDATION,
      documentId: null,
      model: RULES_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      costMicroUsd: 0,
    });
    return report;
  }
}
