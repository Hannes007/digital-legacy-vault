import { IdentityError } from './identity.errors';

/** Organisation not found (or soft-deleted). */
export class OrganisationNotFoundError extends IdentityError {
  readonly code = 'ORG_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Organisation not found.');
  }
}

/** Caller is not an active member of the organisation. */
export class NotOrganisationMemberError extends IdentityError {
  readonly code = 'ORG_FORBIDDEN';
  readonly httpStatus = 403;
  constructor() {
    super('You are not a member of this organisation.');
  }
}

/** Action requires an organisation admin role. */
export class OrgAdminRequiredError extends IdentityError {
  readonly code = 'ORG_ADMIN_REQUIRED';
  readonly httpStatus = 403;
  constructor() {
    super('This action requires an organisation administrator.');
  }
}

/** The target user is already a member (or has a pending invite). */
export class OrgMembershipExistsError extends IdentityError {
  readonly code = 'ORG_MEMBER_EXISTS';
  readonly httpStatus = 409;
  constructor() {
    super('That user is already a member of this organisation.');
  }
}

/** Membership row not found for the given organisation + user. */
export class OrgMemberNotFoundError extends IdentityError {
  readonly code = 'ORG_MEMBER_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Organisation member not found.');
  }
}

/** Invited a user who does not have a DLV account yet. */
export class InviteeNotRegisteredError extends IdentityError {
  readonly code = 'ORG_INVITEE_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('No account exists for that email address.');
  }
}

/** Accepting an invitation that does not exist or is not pending. */
export class NoPendingInvitationError extends IdentityError {
  readonly code = 'ORG_NO_PENDING_INVITE';
  readonly httpStatus = 404;
  constructor() {
    super('There is no pending invitation for you to accept.');
  }
}

/** An admin attempted to remove/demote the last remaining admin. */
export class LastOrgAdminError extends IdentityError {
  readonly code = 'ORG_LAST_ADMIN';
  readonly httpStatus = 409;
  constructor() {
    super('An organisation must keep at least one administrator.');
  }
}
