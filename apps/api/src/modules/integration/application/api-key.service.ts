import { API_KEY_SCOPES, ApiKeyStatus } from '@dlv/shared-types';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import { generateApiKey, hashApiKey, looksLikeApiKey } from '../domain/api-key';

import { API_KEY_REPOSITORY } from './ports';

import type { ApiKeyRecord, ApiKeyRepository } from './ports';
import type { Clock } from '../../../common/time/clock';
import type { ApiKeyDto, ApiKeyScope, CreateApiKeyRequest, CreatedApiKeyDto } from '@dlv/shared-types';

/** Authenticated partner principal attached to API-key requests. */
export interface ApiKeyPrincipal {
  apiKeyId: string;
  ownerUserId: string;
  organisationId: string | null;
  scopes: ApiKeyScope[];
}

function toDto(record: ApiKeyRecord): ApiKeyDto {
  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    scopes: record.scopes,
    status: record.status,
    organisationId: record.organisationId,
    expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    lastUsedAt: record.lastUsedAt ? record.lastUsedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * Partner API keys (Phase 8): hashed at rest (SHA-256, never recoverable),
 * least-privilege scopes, optional expiry, revocable, every issue/revoke
 * audited. `authenticate` is the guard-side entry point.
 */
@Injectable()
export class ApiKeyService {
  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly keys: ApiKeyRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async create(ownerUserId: string, input: CreateApiKeyRequest): Promise<CreatedApiKeyDto> {
    if (input.scopes.length === 0) throw new BadRequestException('Select at least one scope.');
    const invalid = input.scopes.filter((s) => !(API_KEY_SCOPES as readonly string[]).includes(s));
    if (invalid.length > 0) throw new BadRequestException(`Unknown scopes: ${invalid.join(', ')}`);
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= this.clock.now())) {
      throw new BadRequestException('Expiry must be a future date.');
    }

    const generated = generateApiKey();
    const record = await this.keys.create({
      id: uuidv7(),
      ownerUserId,
      organisationId: input.organisationId ?? null,
      name: input.name.trim(),
      prefix: generated.prefix,
      keyHash: generated.keyHash,
      scopes: input.scopes,
      expiresAt,
    });
    await this.audit.record({
      actorUserId: ownerUserId,
      eventType: 'integration.api_key.created',
      resource: `api_key:${record.id}`,
      payload: { prefix: record.prefix, scopes: record.scopes },
    });
    return { ...toDto(record), apiKey: generated.apiKey };
  }

  async list(ownerUserId: string): Promise<ApiKeyDto[]> {
    return (await this.keys.listByOwner(ownerUserId)).map(toDto);
  }

  async revoke(ownerUserId: string, id: string): Promise<void> {
    const record = await this.keys.findById(id);
    if (!record) throw new NotFoundException('API key not found.');
    if (record.ownerUserId !== ownerUserId) throw new ForbiddenException('Not your API key.');
    await this.keys.revoke(id);
    await this.audit.record({
      actorUserId: ownerUserId,
      eventType: 'integration.api_key.revoked',
      resource: `api_key:${id}`,
      payload: { prefix: record.prefix },
    });
  }

  /** Guard entry point: resolves a bearer credential to a partner principal. */
  async authenticate(rawKey: string): Promise<ApiKeyPrincipal> {
    if (!looksLikeApiKey(rawKey)) throw new UnauthorizedException('Invalid API key.');
    const record = await this.keys.findByHash(hashApiKey(rawKey));
    if (!record || record.status !== ApiKeyStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid API key.');
    }
    const now = this.clock.now();
    if (record.expiresAt && record.expiresAt <= now) {
      throw new UnauthorizedException('This API key has expired.');
    }
    await this.keys.touchLastUsed(record.id, now);
    return {
      apiKeyId: record.id,
      ownerUserId: record.ownerUserId,
      organisationId: record.organisationId,
      scopes: record.scopes,
    };
  }
}
