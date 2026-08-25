import { Module } from '@nestjs/common';

import { CaslAbilityFactory } from './ability.factory';
import { PoliciesGuard } from './policies.guard';

/**
 * RBAC/ABAC via CASL. Exposes the ability factory and the PoliciesGuard so any
 * bounded context can gate routes with @CheckPolicies. Import where needed.
 */
@Module({
  providers: [CaslAbilityFactory, PoliciesGuard],
  exports: [CaslAbilityFactory, PoliciesGuard],
})
export class AuthorizationModule {}
