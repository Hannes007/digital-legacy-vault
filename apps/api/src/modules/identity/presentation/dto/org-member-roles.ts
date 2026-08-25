import type { OrgMemberRole } from '../../application/org-ports';

/** Assignable organisation member roles (used by invite / role-change DTOs). */
export const ORG_MEMBER_ROLES: OrgMemberRole[] = [
  'COMPANY_ADMIN',
  'HOSPITAL_ADMIN',
  'LAWYER',
  'DOCTOR',
  'FINANCIAL_ADVISER',
  'MEMBER',
];
