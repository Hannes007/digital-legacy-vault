import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';

import { ORG_MEMBER_ROLES } from './org-member-roles';

import type { OrgMemberRole } from '../../application/org-ports';

/** `POST /api/v1/organisations/:id/invitations` body. Role defaults to MEMBER. */
export class InviteMemberDto {
  @IsEmail({}, { message: 'must be a valid email address' })
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsIn(ORG_MEMBER_ROLES, { message: `must be one of: ${ORG_MEMBER_ROLES.join(', ')}` })
  role?: OrgMemberRole;
}
