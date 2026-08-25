import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { ApiKeyService, type ApiKeyPrincipal } from '../application/api-key.service';

import type { Request } from 'express';

export interface PartnerRequest extends Request {
  partner?: ApiKeyPrincipal;
}

/**
 * Partner-API authentication (Phase 8): `Authorization: Bearer dlv_sk_…` or
 * `X-Api-Key`. Resolves and attaches the partner principal; scope checks are
 * per-route via ApiKeyScopes/PartnerScopeGuard. Deny by default.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<PartnerRequest>();
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const headerKey = req.headers['x-api-key'];
    const raw = bearer ?? (typeof headerKey === 'string' ? headerKey : undefined);
    if (!raw) throw new UnauthorizedException('Provide an API key.');
    req.partner = await this.apiKeys.authenticate(raw);
    return true;
  }
}
