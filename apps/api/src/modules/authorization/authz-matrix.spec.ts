import { Role } from '@dlv/shared-types';

import { Action, defineAbilityFor, type Subject } from './ability.factory';

import type { AuthUser } from '../identity/presentation/authenticated-request';

/**
 * Full 15-role × subject × action authorisation matrix (mitigation backlog
 * M-02, a launch-gate control). Every cell is asserted against an EXPLICIT
 * expected-allow table, so this fails closed: if a policy is loosened, the
 * matrix must be updated deliberately, and any accidental grant is caught.
 *
 * This is coarse RBAC (action × resource-type); resource-instance ABAC
 * (ownership, vault-relationship scope) is covered by the service-layer specs
 * (e.g. RelationshipAccessService, OrganisationService, ClientRelationship).
 */
const principal = (roles: Role[]): AuthUser => ({ userId: 'u1', sessionId: 's1', roles });

const SUBJECTS: Subject[] = [
  'User', 'Organisation', 'OrganisationMember', 'Vault', 'Document', 'DocumentShare',
  'EmergencyAccess', 'Signature', 'AuditEvent', 'Subscription', 'Notification',
];
const ACTIONS: Action[] = [Action.Create, Action.Read, Action.Update, Action.Delete];

type Grant = Partial<Record<Subject, Action[] | 'all'>>;
const ALL: Action[] = [Action.Create, Action.Read, Action.Update, Action.Delete];
const R = [Action.Read];
const RC = [Action.Read, Action.Create];
const RU = [Action.Read, Action.Update];

/** Expected allowed (action, subject) pairs per role, in isolation. */
const EXPECTED: Record<Role, Grant> = {
  [Role.GUEST]: {},
  [Role.REGISTERED_USER]: {
    User: RU, Organisation: [Action.Create], Vault: ALL, Document: ALL,
    DocumentShare: ALL, Signature: RC, Subscription: R,
  },
  [Role.PREMIUM_USER]: {
    User: RU, Organisation: [Action.Create], Vault: ALL, Document: ALL,
    DocumentShare: ALL, Signature: RC, Subscription: R, EmergencyAccess: ALL,
  },
  [Role.FAMILY_ADMIN]: { Organisation: ALL, OrganisationMember: ALL },
  [Role.EXECUTOR]: { Document: R, EmergencyAccess: R },
  [Role.BENEFICIARY]: { Document: R, EmergencyAccess: R },
  [Role.LAWYER]: { Document: R, EmergencyAccess: R },
  [Role.DOCTOR]: { Document: R, EmergencyAccess: R },
  [Role.HOSPITAL_ADMIN]: { Document: R, EmergencyAccess: R },
  [Role.FINANCIAL_ADVISER]: { Document: R, EmergencyAccess: R },
  [Role.COMPANY_ADMIN]: { Organisation: ALL, OrganisationMember: ALL, Subscription: ALL },
  [Role.SYSTEM_ADMIN]: {
    User: 'all', Organisation: 'all', OrganisationMember: 'all', Vault: 'all',
    Document: 'all', DocumentShare: 'all', EmergencyAccess: 'all', Signature: 'all',
    AuditEvent: 'all', Subscription: 'all', Notification: 'all',
  },
  [Role.SUPER_ADMIN]: {
    User: 'all', Organisation: 'all', OrganisationMember: 'all', Vault: 'all',
    Document: 'all', DocumentShare: 'all', EmergencyAccess: 'all', Signature: 'all',
    AuditEvent: 'all', Subscription: 'all', Notification: 'all',
  },
  [Role.AUDITOR]: {
    User: R, Organisation: R, OrganisationMember: R, Vault: R, Document: R,
    DocumentShare: R, EmergencyAccess: R, Signature: R, AuditEvent: R,
    Subscription: R, Notification: R,
  },
  [Role.SUPPORT_AGENT]: { User: R, Organisation: R, Subscription: R, Notification: ALL },
};

function isAllowed(grant: Grant, subject: Subject, action: Action): boolean {
  const cell = grant[subject];
  if (!cell) return false;
  if (cell === 'all') return true;
  return cell.includes(action);
}

describe('Authorisation matrix (M-02 launch gate)', () => {
  for (const role of Object.values(Role)) {
    it(`enforces the exact matrix for ${role} (deny-by-default)`, () => {
      const ability = defineAbilityFor(principal([role]));
      const grant = EXPECTED[role];
      for (const subject of SUBJECTS) {
        for (const action of ACTIONS) {
          const expected = isAllowed(grant, subject, action);
          const actual = ability.can(action, subject);
          if (actual !== expected) {
            throw new Error(
              `${role} ${action} ${subject} should be ${expected ? 'ALLOWED' : 'DENIED'} but was ${actual ? 'ALLOWED' : 'DENIED'}`,
            );
          }
        }
      }
    });
  }

  it('covers every one of the 15 canonical roles', () => {
    expect(Object.keys(EXPECTED)).toHaveLength(15);
    expect(Object.values(Role)).toHaveLength(15);
  });

  it('never lets SUPPORT_AGENT read document contents (privacy invariant)', () => {
    const ability = defineAbilityFor(principal([Role.SUPPORT_AGENT]));
    expect(ability.can(Action.Read, 'Document')).toBe(false);
  });

  it('combines roles additively (least surprise for multi-role users)', () => {
    const ability = defineAbilityFor(principal([Role.REGISTERED_USER, Role.PREMIUM_USER]));
    expect(ability.can(Action.Manage, 'EmergencyAccess')).toBe(true);
    expect(ability.can(Action.Manage, 'Vault')).toBe(true);
  });
});
