import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';

import { PARTNER_DOCUMENT_PORT } from '../application/ports';

import { ApiKeyGuard, type PartnerRequest } from './api-key.guard';
import { PartnerScopeGuard, RequireScopes } from './scopes.decorator';

import type { PartnerDocumentPort } from '../application/ports';

interface PartnerDocumentDto {
  id: string;
  title: string;
  type: string;
  status: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Scoped partner API v1 (Phase 8). API-key authenticated, least-privilege
 * scopes per route, metadata only — document content is never exposed here.
 * Contract: docs/08-api/partner-openapi.yaml (OpenAPI 3.1).
 */
@Controller('partner')
@UseGuards(ApiKeyGuard, PartnerScopeGuard)
export class PartnerController {
  constructor(
    @Inject(PARTNER_DOCUMENT_PORT) private readonly documents: PartnerDocumentPort,
  ) {}

  @Get('ping')
  ping(@Req() req: PartnerRequest): { ok: boolean; keyId: string | undefined; scopes: string[] } {
    return { ok: true, keyId: req.partner?.apiKeyId, scopes: req.partner?.scopes ?? [] };
  }

  @Get('documents')
  @RequireScopes('documents:read')
  async listDocuments(@Req() req: PartnerRequest, @Query('limit') limit?: string): Promise<PartnerDocumentDto[]> {
    const capped = Math.min(Math.max(Number(limit ?? 50) || 50, 1), 100);
    const rows = await this.documents.listByOwner(req.partner?.ownerUserId ?? '', capped);
    return rows.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      status: d.status,
      currentVersion: d.currentVersion,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }
}
