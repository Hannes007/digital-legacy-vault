import { IsIn } from 'class-validator';

import { ORG_MEMBER_ROLES } from './org-member-roles';

import type { OrgMemberRole } from '../../application/org-ports';

/** `PATCH /api/v1/organisations/:id/members/:userId` body. */
export class UpdateMemberRoleDto {
  @IsIn(ORG_MEMBER_ROLES, { message: `must be one of: ${ORG_MEMBER_ROLES.join(', ')}` })
  role!: OrgMemberRole;
}
