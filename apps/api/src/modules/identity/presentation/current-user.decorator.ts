import { type ExecutionContext, createParamDecorator } from '@nestjs/common';

import type { AuthUser, AuthenticatedRequest } from './authenticated-request';

/**
 * Injects the authenticated principal attached by {@link JwtAuthGuard}. Only
 * use on routes protected by that guard, or `authUser` will be undefined.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return req.authUser;
  },
);
