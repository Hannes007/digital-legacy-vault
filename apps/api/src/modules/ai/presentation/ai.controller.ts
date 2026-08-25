import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { AiPreferenceService } from '../application/ai-preference.service';
import { AiUsageService } from '../application/ai-usage.service';
import { CompletenessService } from '../application/completeness.service';
import { DocumentInsightService } from '../application/document-insight.service';
import { NlSearchService } from '../application/nl-search.service';

import { AiSearchDto, GenerateInsightDto, UpdateAiPreferenceDto } from './dto/ai.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';
import type {
  AiInsightDto,
  AiPreferenceDto,
  AiSearchResultDto,
  AiUsageSummaryDto,
  CompletenessReportDto,
} from '@dlv/shared-types';

/**
 * AI context API (Phase 7). Every route is owner-scoped; opt-out, entitlement
 * and budget guards live in the services; client-encrypted exclusion is
 * type-enforced below the services (coding-standards §10.8).
 */
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly preferences: AiPreferenceService,
    private readonly insights: DocumentInsightService,
    private readonly completeness: CompletenessService,
    private readonly search: NlSearchService,
    private readonly usage: AiUsageService,
  ) {}

  @Get('preferences')
  getPreferences(@CurrentUser() user: AuthUser): Promise<AiPreferenceDto> {
    return this.preferences.get(user.userId);
  }

  @Put('preferences')
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateAiPreferenceDto,
  ): Promise<AiPreferenceDto> {
    return this.preferences.update(user.userId, body.aiEnabled);
  }

  @Post('documents/:id/insight')
  generateInsight(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: GenerateInsightDto,
  ): Promise<AiInsightDto> {
    return this.insights.generate(user.userId, id, body.apply ?? false);
  }

  @Get('documents/:id/insight')
  latestInsight(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AiInsightDto> {
    return this.insights.latest(user.userId, id);
  }

  @Get('recommendations')
  recommendations(@CurrentUser() user: AuthUser): Promise<CompletenessReportDto> {
    return this.completeness.report(user.userId);
  }

  @Post('search')
  nlSearch(@CurrentUser() user: AuthUser, @Body() body: AiSearchDto): Promise<AiSearchResultDto> {
    return this.search.query(user.userId, body.query, body.limit);
  }

  @Get('usage')
  usageSummary(@CurrentUser() user: AuthUser): Promise<AiUsageSummaryDto> {
    return this.usage.summary(user.userId);
  }
}
