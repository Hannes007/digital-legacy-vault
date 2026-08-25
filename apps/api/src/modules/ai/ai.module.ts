import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';

import { AiPreferenceService } from './application/ai-preference.service';
import { AiUsageService } from './application/ai-usage.service';
import { CompletenessService } from './application/completeness.service';
import { DocumentInsightService } from './application/document-insight.service';
import { NlSearchService } from './application/nl-search.service';
import {
  AI_GATEWAY,
  AI_INSIGHT_REPOSITORY,
  AI_PREFERENCE_REPOSITORY,
  AI_SEARCH_PORT,
  AI_TEXT_SOURCE,
  AI_USAGE_REPOSITORY,
} from './application/ports';
import { AnthropicAiGateway } from './infrastructure/anthropic-ai.gateway';
import { PgAiSearchAdapter } from './infrastructure/pg-ai-search.adapter';
import { PrismaAiTextSource } from './infrastructure/prisma-ai-text.source';
import {
  PrismaAiInsightRepository,
  PrismaAiPreferenceRepository,
  PrismaAiUsageRepository,
} from './infrastructure/prisma-ai.repositories';
import { AiController } from './presentation/ai.controller';

/**
 * AI bounded context (Phase 7, PROJECT_MEMORY §2.8): classification +
 * auto-categorisation, summaries, completeness recommendations and
 * natural-language search behind the `AiGateway` provider abstraction
 * (Anthropic Claude; deterministic offline dev fallback). Client-Encrypted
 * Vault content is excluded both at the type level (`ServerProcessableText`)
 * and at the SQL level (STANDARD-vault predicates). Plan gating comes from
 * billing's `EntitlementService`; every request is cost-instrumented.
 */
@Module({
  imports: [AuditModule, IdentityModule, BillingModule],
  controllers: [AiController],
  providers: [
    AiPreferenceService,
    AiUsageService,
    DocumentInsightService,
    CompletenessService,
    NlSearchService,
    { provide: AI_GATEWAY, useClass: AnthropicAiGateway },
    { provide: AI_TEXT_SOURCE, useClass: PrismaAiTextSource },
    { provide: AI_SEARCH_PORT, useClass: PgAiSearchAdapter },
    { provide: AI_INSIGHT_REPOSITORY, useClass: PrismaAiInsightRepository },
    { provide: AI_USAGE_REPOSITORY, useClass: PrismaAiUsageRepository },
    { provide: AI_PREFERENCE_REPOSITORY, useClass: PrismaAiPreferenceRepository },
  ],
})
export class AiModule {}
