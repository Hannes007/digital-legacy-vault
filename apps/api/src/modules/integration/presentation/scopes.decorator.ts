import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { PartnerRequest } from './api-key.guard';
import type { ApiKeyScope } from '@dlv/shared-types';

export const API_SCOPES_KEY = 'dlv:api-scopes';

/** Declares the scopes a partner route requires (all must be present). */
export const RequireScopes = (...scopes: ApiKeyScope[]) => SetMetadata(API_SCOPES_KEY, scopes);

/** Enforces @RequireScopes against the authenticated partner principal. */
@Injectable()
export class PartnerScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<ApiKeyScope[] | undefined>(API_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (required.length === 0) return true;
    const req = context.switchToHttp().getRequest<PartnerRequest>();
    const held = new Set(req.partner?.scopes ?? []);
    const missing = required.filter((s) => !held.has(s));
    if (missing.length > 0) {
      throw new ForbiddenException(`API key is missing scopes: ${missing.join(', ')}`);
    }
    return true;
  }
}
