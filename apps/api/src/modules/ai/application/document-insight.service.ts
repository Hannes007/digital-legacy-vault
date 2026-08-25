import { DocumentStatus, AiFeature, DocumentType } from '@dlv/shared-types';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK, ENV } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import { EntitlementService } from '../../billing/application/entitlement.service';
import { estimateCostMicroUsd } from '../domain/cost';
import {
  ClientEncryptedExclusionError,
  toServerProcessable,
  truncateProcessable,
} from '../domain/server-processable';

import { AiPreferenceService } from './ai-preference.service';
import { AiUsageService } from './ai-usage.service';
import { AI_GATEWAY, AI_INSIGHT_REPOSITORY, AI_TEXT_SOURCE } from './ports';

import type {
  AiGateway,
  AiInsightRecord,
  AiInsightRepository,
  AiTextSource,
  DocumentTextRecord,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { Env } from '@dlv/config';
import type { AiInsightDto } from '@dlv/shared-types';

/**
 * Document classification + auto-categorisation + summaries (Phase 7).
 *
 * Order of guards is part of the security contract:
 *   opt-out → entitlement → daily budget → ownership/status → **client-encrypted
 *   exclusion** → gateway. Telemetry is only written after the exclusion guard,
 *   so `ai_usage`/`ai_insights` can never reference client-encrypted content
 *   (roadmap Phase 7 exit: zero client-encrypted objects in AI telemetry).
 */
@Injectable()
export class DocumentInsightService {
  constructor(
    @Inject(AI_GATEWAY) private readonly gateway: AiGateway,
    @Inject(AI_TEXT_SOURCE) private readonly textSource: AiTextSource,
    @Inject(AI_INSIGHT_REPOSITORY) private readonly insights: AiInsightRepository,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly preferences: AiPreferenceService,
    private readonly entitlements: EntitlementService,
    private readonly usage: AiUsageService,
    private readonly audit: AuditService,
  ) {}

  private monthStart(): Date {
    const now = this.clock.now();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  private async loadOwned(userId: string, documentId: string): Promise<DocumentTextRecord> {
    const record = await this.textSource.getDocumentText(documentId);
    if (!record) throw new NotFoundException('Document not found.');
    if (record.ownerId !== userId) throw new ForbiddenException('You do not own this document.');
    return record;
  }

  async generate(userId: string, documentId: string, apply: boolean): Promise<AiInsightDto> {
    await this.preferences.assertEnabled(userId);

    const monthStart = this.monthStart();
    const [docsThisMonth, alreadyCounted] = await Promise.all([
      this.insights.countDistinctDocumentsSince(userId, monthStart),
      this.insights.hasInsightForDocumentSince(documentId, monthStart),
    ]);
    await this.entitlements.assertCanUseAiDoc(userId, {
      docsThisMonth,
      isNewDocument: !alreadyCounted,
    });
    await this.usage.assertWithinDailyCap(userId);

    const record = await this.loadOwned(userId, documentId);
    if (record.status !== DocumentStatus.READY) {
      throw new UnprocessableEntityException('The document must finish processing before AI can read it.');
    }
    if (record.text === null || record.text.trim().length === 0) {
      throw new UnprocessableEntityException('No extracted text is available for this document yet.');
    }

    // Client-encrypted exclusion — MUST precede any gateway call or telemetry.
    let processable;
    try {
      processable = toServerProcessable({ vaultKind: record.vaultKind, text: record.text });
    } catch (error) {
      if (error instanceof ClientEncryptedExclusionError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
    const bounded = truncateProcessable(processable, this.env.AI_MAX_INPUT_CHARS);

    const [classification, summary] = await Promise.all([
      this.gateway.classify(bounded),
      this.gateway.summarise(bounded, record.title),
    ]);

    const appliedAt = apply ? this.clock.now() : null;
    const insight = await this.insights.create({
      id: uuidv7(),
      documentId,
      ownerId: userId,
      suggestedType: classification.type,
      confidence: classification.confidence,
      summary: summary.summary,
      model: classification.model,
      appliedAt,
    });
    if (apply) {
      await this.textSource.applySuggestedType(documentId, classification.type);
    }

    await Promise.all([
      this.usage.record({
        userId,
        feature: AiFeature.CLASSIFICATION,
        documentId,
        model: classification.model,
        inputTokens: classification.inputTokens,
        outputTokens: classification.outputTokens,
        costMicroUsd: estimateCostMicroUsd(classification.model, classification),
      }),
      this.usage.record({
        userId,
        feature: AiFeature.SUMMARY,
        documentId,
        model: summary.model,
        inputTokens: summary.inputTokens,
        outputTokens: summary.outputTokens,
        costMicroUsd: estimateCostMicroUsd(summary.model, summary),
      }),
      this.audit.record({
        actorUserId: userId,
        eventType: 'ai.insight.generated',
        resource: `document:${documentId}`,
        payload: {
          suggestedType: classification.type,
          confidence: classification.confidence,
          applied: apply,
          model: classification.model,
        },
      }),
    ]);

    return this.toDto(insight);
  }

  async latest(userId: string, documentId: string): Promise<AiInsightDto> {
    await this.loadOwned(userId, documentId);
    const insight = await this.insights.latestForDocument(documentId);
    if (!insight) throw new NotFoundException('No AI insight exists for this document yet.');
    return this.toDto(insight);
  }

  private toDto(record: AiInsightRecord): AiInsightDto {
    return {
      id: record.id,
      documentId: record.documentId,
      suggestedType: record.suggestedType as DocumentType,
      confidence: record.confidence,
      summary: record.summary,
      model: record.model,
      applied: record.appliedAt !== null,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
