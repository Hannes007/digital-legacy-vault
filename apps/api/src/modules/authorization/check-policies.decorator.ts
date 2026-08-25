import { SetMetadata } from '@nestjs/common';

import type { AppAbility } from './ability.factory';

/** A policy is a predicate over the caller's ability. */
export type PolicyHandlerCallback = (ability: AppAbility) => boolean;
export interface PolicyHandlerObject {
  handle(ability: AppAbility): boolean;
}
export type PolicyHandler = PolicyHandlerCallback | PolicyHandlerObject;

export const CHECK_POLICIES_KEY = 'dlv:check_policies';

/**
 * Attach one or more policies to a route/controller. All must pass (AND).
 * Evaluated by {@link PoliciesGuard}, which must run after JwtAuthGuard.
 */
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
