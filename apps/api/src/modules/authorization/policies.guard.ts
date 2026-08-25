import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CaslAbilityFactory, type AppAbility } from './ability.factory';
import { CHECK_POLICIES_KEY, type PolicyHandler } from './check-policies.decorator';

import type { AuthenticatedRequest } from '../identity/presentation/authenticated-request';

/**
 * Evaluates @CheckPolicies handlers against the CASL ability built from the
 * authenticated principal. Routes without policies pass through (authn is still
 * enforced separately by JwtAuthGuard). Deny-by-default once a policy is set.
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handlers =
      this.reflector.getAllAndOverride<PolicyHandler[]>(CHECK_POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (handlers.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.authUser) {
      throw new ForbiddenException('Authentication required before authorization.');
    }

    const ability = this.abilityFactory.createForUser(req.authUser);
    const allowed = handlers.every((handler) => execPolicy(handler, ability));
    if (!allowed) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }
}

function execPolicy(handler: PolicyHandler, ability: AppAbility): boolean {
  return typeof handler === 'function' ? handler(ability) : handler.handle(ability);
}
