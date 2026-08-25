import type { Role } from '@dlv/shared-types';
import type { Request } from 'express';

/** Authenticated principal derived from a verified access token + live session. */
export interface AuthUser {
  userId: string;
  sessionId: string;
  roles: Role[];
}

/** Express request augmented by {@link JwtAuthGuard}. */
export interface AuthenticatedRequest extends Request {
  authUser: AuthUser;
}
