import { DocumentStatus, DocumentType, VaultKind } from '@dlv/shared-types';
import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';

import { DocumentInsightService } from './document-insight.service';

import type { AiPreferenceService } from './ai-preference.service';
import type { AiUsageService } from './ai-usage.service';
import type {
  AiGateway,
  AiInsightRecord,
  AiInsightRepository,
  AiTextSource,
  DocumentTextRecord,
  RecordUsageInput,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { AuditService } from '../../audit/audit.service';
import type { EntitlementService } from '../../billing/application/entitlement.service';
import type { Env } from '@dlv/config';

const clock: Clock = { now: () => new Date('2026-07-19T10:00:00Z') };
const env = { AI_MAX_INPUT_CHARS: 1_000 } as Env;

function doc(overrides: Partial<DocumentTextRecord> = {}): DocumentTextRecord {
  return {
    documentId: 'd1',
    ownerId: 'u1',
    title: 'My policy',
    type: 'OTHER',
    status: DocumentStatus.READY,
    vaultKind: VaultKind.STANDARD,
    text: 'Life insurance policy schedule. Policy number 1. Sum assured R1m. Policyholder me.',
    ...overrides,
  };
}

interface Harness {
  svc: DocumentInsightService;
  telemetry: RecordUsageInput[];
  insights: AiInsightRecord[];
  applied: Array<{ documentId: string; type: DocumentType }>;
  audits: string[];
}

function harness(record: DocumentTextRecord | null, opts: { aiEnabled?: boolean; gateFails?: boolean; capFails?: boolean } = {}): Harness {
  const telemetry: RecordUsageInput[] = [];
  const insights: AiInsightRecord[] = [];
  const applied: Array<{ documentId: string; type: DocumentType }> = [];
  const audits: string[] = [];

  const gateway: AiGateway = {
    classify: async (text) => ({ type: DocumentType.INSURANCE, confidence: 0.9, inputTokens: text.length / 4, outputTokens: 8, model: 'dev-heuristic' }),
    summarise: async () => ({ summary: 'A policy.', inputTokens: 10, outputTokens: 5, model: 'dev-heuristic' }),
    extractKeywords: async () => ({ keywords: [], inputTokens: 0, outputTokens: 0, model: 'dev-heuristic' }),
  };
  const textSource: AiTextSource = {
    getDocumentText: async () => record,
    listOwnerDocumentTypes: async () => [],
    applySuggestedType: async (documentId, type) => { applied.push({ documentId, type }); },
  };
  const insightRepo: AiInsightRepository = {
    create: async (input) => {
      const rec: AiInsightRecord = { ...input, createdAt: clock.now() };
      insights.push(rec);
      return rec;
    },
    latestForDocument: async () => insights[insights.length - 1] ?? null,
    countDistinctDocumentsSince: async () => 0,
    hasInsightForDocumentSince: async () => false,
  };
  const preferences = {
    assertEnabled: async () => {
      if (opts.aiEnabled === false) throw new ForbiddenException('AI off');
    },
  } as unknown as AiPreferenceService;
  const entitlements = {
    assertCanUseAiDoc: async () => {
      if (opts.gateFails) throw new ForbiddenException('plan limit');
    },
  } as unknown as EntitlementService;
  const usage = {
    assertWithinDailyCap: async () => {
      if (opts.capFails) throw new ForbiddenException('budget');
    },
    record: async (input: RecordUsageInput) => { telemetry.push(input); },
  } as unknown as AiUsageService;
  const audit = {
    record: async (input: { eventType: string }) => { audits.push(input.eventType); },
  } as unknown as AuditService;

  const svc = new DocumentInsightService(
    gateway, textSource, insightRepo, env, clock, preferences, entitlements, usage, audit,
  );
  return { svc, telemetry, insights, applied, audits };
}

describe('DocumentInsightService (Phase 7)', () => {
  it('generates, persists and audits an insight with two telemetry rows', async () => {
    const h = harness(doc());
    const dto = await h.svc.generate('u1', 'd1', false);
    expect(dto.suggestedType).toBe(DocumentType.INSURANCE);
    expect(dto.applied).toBe(false);
    expect(h.telemetry.map((t) => t.feature).sort()).toStrictEqual(['CLASSIFICATION', 'SUMMARY']);
    expect(h.audits).toStrictEqual(['ai.insight.generated']);
  });

  it('auto-categorises when apply=true', async () => {
    const h = harness(doc());
    const dto = await h.svc.generate('u1', 'd1', true);
    expect(dto.applied).toBe(true);
    expect(h.applied).toStrictEqual([{ documentId: 'd1', type: DocumentType.INSURANCE }]);
  });

  it('rejects client-encrypted documents BEFORE any telemetry or insight write', async () => {
    const h = harness(doc({ vaultKind: VaultKind.CLIENT_ENCRYPTED }));
    await expect(h.svc.generate('u1', 'd1', false)).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.telemetry).toHaveLength(0);
    expect(h.insights).toHaveLength(0);
    expect(h.audits).toHaveLength(0);
  });

  it('honours the per-user opt-out before anything else', async () => {
    const h = harness(doc(), { aiEnabled: false });
    await expect(h.svc.generate('u1', 'd1', false)).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.telemetry).toHaveLength(0);
  });

  it('enforces the plan entitlement and the daily budget cap', async () => {
    const gated = harness(doc(), { gateFails: true });
    await expect(gated.svc.generate('u1', 'd1', false)).rejects.toBeInstanceOf(ForbiddenException);
    const capped = harness(doc(), { capFails: true });
    await expect(capped.svc.generate('u1', 'd1', false)).rejects.toBeInstanceOf(ForbiddenException);
    expect(gated.telemetry).toHaveLength(0);
    expect(capped.telemetry).toHaveLength(0);
  });

  it('rejects non-owners and non-READY or textless documents', async () => {
    const notOwner = harness(doc({ ownerId: 'someone-else' }));
    await expect(notOwner.svc.generate('u1', 'd1', false)).rejects.toBeInstanceOf(ForbiddenException);
    const notReady = harness(doc({ status: DocumentStatus.SCANNING }));
    await expect(notReady.svc.generate('u1', 'd1', false)).rejects.toBeInstanceOf(UnprocessableEntityException);
    const noText = harness(doc({ text: null }));
    await expect(noText.svc.generate('u1', 'd1', false)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
