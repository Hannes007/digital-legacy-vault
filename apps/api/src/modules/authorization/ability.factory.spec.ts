import { Role } from '@dlv/shared-types';

import { Action, defineAbilityFor } from './ability.factory';

import type { AuthUser } from '../identity/presentation/authenticated-request';

const principal = (roles: Role[]): AuthUser => ({
  userId: 'user-1',
  sessionId: 'sess-1',
  roles,
});

describe('defineAbilityFor', () => {
  it('grants super admins full control', () => {
    const ability = defineAbilityFor(principal([Role.SUPER_ADMIN]));
    expect(ability.can(Action.Manage, 'all')).toBe(true);
    expect(ability.can(Action.Delete, 'Document')).toBe(true);
    expect(ability.can(Action.Update, 'Subscription')).toBe(true);
  });

  it('makes auditors strictly read-only', () => {
    const ability = defineAbilityFor(principal([Role.AUDITOR]));
    expect(ability.can(Action.Read, 'AuditEvent')).toBe(true);
    expect(ability.can(Action.Update, 'AuditEvent')).toBe(false);
    expect(ability.can(Action.Delete, 'Document')).toBe(false);
  });

  it('lets support agents help without seeing document contents', () => {
    const ability = defineAbilityFor(principal([Role.SUPPORT_AGENT]));
    expect(ability.can(Action.Read, 'User')).toBe(true);
    expect(ability.can(Action.Manage, 'Notification')).toBe(true);
    expect(ability.can(Action.Read, 'Document')).toBe(false);
  });

  it('scopes end users to end-user capabilities', () => {
    const ability = defineAbilityFor(principal([Role.REGISTERED_USER]));
    expect(ability.can(Action.Create, 'Organisation')).toBe(true);
    expect(ability.can(Action.Manage, 'Document')).toBe(true);
    expect(ability.can(Action.Update, 'User')).toBe(true);
    // emergency access is a premium capability
    expect(ability.can(Action.Manage, 'EmergencyAccess')).toBe(false);
    // and they cannot administer subscriptions
    expect(ability.can(Action.Update, 'Subscription')).toBe(false);
  });

  it('unlocks emergency access for premium users', () => {
    const ability = defineAbilityFor(principal([Role.REGISTERED_USER, Role.PREMIUM_USER]));
    expect(ability.can(Action.Manage, 'EmergencyAccess')).toBe(true);
  });

  it('gives org admins member management + billing', () => {
    const ability = defineAbilityFor(principal([Role.REGISTERED_USER, Role.COMPANY_ADMIN]));
    expect(ability.can(Action.Manage, 'OrganisationMember')).toBe(true);
    expect(ability.can(Action.Manage, 'Subscription')).toBe(true);
  });

  it('denies everything to a role-less principal (deny by default)', () => {
    const ability = defineAbilityFor(principal([]));
    expect(ability.can(Action.Read, 'Document')).toBe(false);
    expect(ability.can(Action.Create, 'Organisation')).toBe(false);
  });
});
