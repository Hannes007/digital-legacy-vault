import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';

import { Role } from '@dlv/shared-types';

import type { AuthUser } from '../identity/presentation/authenticated-request';

/** CRUD + `manage` (any action) — the CASL action vocabulary. */
export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

/** Resource types guarded across the platform (aligns with domain entities §5). */
export type Subject =
  | 'User'
  | 'Organisation'
  | 'OrganisationMember'
  | 'Vault'
  | 'Document'
  | 'DocumentShare'
  | 'EmergencyAccess'
  | 'Signature'
  | 'AuditEvent'
  | 'Subscription'
  | 'Notification'
  | 'all';

export type AppAbility = MongoAbility<[Action, Subject]>;

/**
 * Build the ability for a principal from its platform roles (coarse RBAC:
 * action × resource-type). Deny-by-default (§7.8): anything not granted is
 * forbidden.
 *
 * Resource-instance ABAC (ownership, vault-relationship scope) is enforced in
 * the application/service layer where the entity — and its owner/relationship —
 * is loaded (e.g. OrganisationService membership checks). Once entity classes
 * exist (Phase 3), those conditions can move into CASL via `subject()` without
 * changing call sites.
 */
export function defineAbilityFor(user: AuthUser): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  const roles = new Set<Role>(user.roles);
  const has = (role: Role): boolean => roles.has(role);

  // ---- Platform administration ------------------------------------------
  if (has(Role.SUPER_ADMIN) || has(Role.SYSTEM_ADMIN)) {
    can(Action.Manage, 'all');
  }
  if (has(Role.AUDITOR)) {
    can(Action.Read, 'all'); // read-only oversight, incl. the audit log
  }
  if (has(Role.SUPPORT_AGENT)) {
    can(Action.Read, 'User');
    can(Action.Read, 'Organisation');
    can(Action.Read, 'Subscription');
    can(Action.Manage, 'Notification');
    // deliberately NO access to Document contents (privacy invariant)
  }

  // ---- End users (instance ownership enforced in the service layer) -------
  if (has(Role.REGISTERED_USER) || has(Role.PREMIUM_USER)) {
    can([Action.Read, Action.Update], 'User');
    can(Action.Create, 'Organisation');
    can(Action.Manage, 'Vault');
    can(Action.Manage, 'Document');
    can(Action.Manage, 'DocumentShare');
    can([Action.Read, Action.Create], 'Signature');
    can(Action.Read, 'Subscription');
  }
  if (has(Role.PREMIUM_USER)) {
    can(Action.Manage, 'EmergencyAccess');
  }

  // ---- Organisation administration --------------------------------------
  if (has(Role.FAMILY_ADMIN) || has(Role.COMPANY_ADMIN)) {
    can(Action.Manage, 'Organisation');
    can(Action.Manage, 'OrganisationMember');
  }
  if (has(Role.COMPANY_ADMIN)) {
    can(Action.Manage, 'Subscription');
  }

  // ---- Vault-relationship roles (coarse read; scope resolved per-vault) ---
  const relationshipReaders: Role[] = [
    Role.EXECUTOR,
    Role.BENEFICIARY,
    Role.LAWYER,
    Role.FINANCIAL_ADVISER,
    Role.DOCTOR,
    Role.HOSPITAL_ADMIN,
  ];
  if (relationshipReaders.some(has)) {
    can(Action.Read, 'Document');
    can(Action.Read, 'EmergencyAccess');
  }

  return build();
}

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AuthUser): AppAbility {
    return defineAbilityFor(user);
  }
}
