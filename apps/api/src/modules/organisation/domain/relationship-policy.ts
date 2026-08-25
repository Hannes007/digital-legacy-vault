import type { OrgMemberRole } from '../../identity/application/org-ports';

/** Org-member roles that may hold a client-vault relationship (Phase 8). */
const PROFESSIONAL_ROLES: ReadonlySet<OrgMemberRole> = new Set([
  'LAWYER',
  'DOCTOR',
  'FINANCIAL_ADVISER',
]);

/** Only practising professionals request client access — admins administer. */
export function canRequestClientAccess(role: OrgMemberRole): boolean {
  return PROFESSIONAL_ROLES.has(role);
}

/** Org-member roles that administer the workspace. */
const ADMIN_ROLES: ReadonlySet<OrgMemberRole> = new Set(['COMPANY_ADMIN', 'HOSPITAL_ADMIN']);

export function isOrgAdmin(role: OrgMemberRole): boolean {
  return ADMIN_ROLES.has(role);
}
