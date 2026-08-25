/**
 * Emergency-access policy (PROJECT_MEMORY §7.6 + §9) as pure, testable rules.
 *
 *  - Minimum 2 approvers; the requester can never self-approve; platform staff
 *    (SUPPORT_AGENT / SYSTEM_ADMIN) are excluded from approving.
 *  - Time delay before activation: default 72 h (owner-configurable 24 h–30 d);
 *    death claims default 7 d with a 48 h floor; a medical-directive-only scope
 *    can be expedited to 1 h WITH dual medical-professional approval.
 *  - Grant is read-only, time-boxed (default 30 days), scoped to categories.
 */
import { EmergencyScope } from '@dlv/shared-types';

export const MIN_APPROVERS = 2;
export const DEFAULT_DELAY_HOURS = 72;
export const MIN_DELAY_HOURS = 24;
export const MAX_DELAY_HOURS = 720; // 30 days
export const DEATH_CLAIM_DELAY_HOURS = 168; // 7 days
export const DEATH_CLAIM_FLOOR_HOURS = 48;
export const MEDICAL_EXPEDITE_HOURS = 1;
export const GRANT_DURATION_DAYS = 30;
export const EXCLUDED_APPROVER_ROLES = ['SUPPORT_AGENT', 'SYSTEM_ADMIN', 'SUPER_ADMIN'];

const HOUR_MS = 3_600_000;

export interface DelayInput {
  isDeathClaim: boolean;
  scope: EmergencyScope;
  /** Owner-configured override in hours (clamped to [MIN,MAX]); optional. */
  ownerDelayHours?: number | undefined;
}

/** Compute the moment the time-delay window elapses. */
export function computeDelayUntil(now: Date, input: DelayInput): Date {
  let hours: number;
  if (input.isDeathClaim) {
    hours = Math.max(DEATH_CLAIM_FLOOR_HOURS, input.ownerDelayHours ?? DEATH_CLAIM_DELAY_HOURS);
  } else if (input.scope === EmergencyScope.MEDICAL_ONLY) {
    hours = MEDICAL_EXPEDITE_HOURS;
  } else {
    const base = input.ownerDelayHours ?? DEFAULT_DELAY_HOURS;
    hours = Math.min(MAX_DELAY_HOURS, Math.max(MIN_DELAY_HOURS, base));
  }
  return new Date(now.getTime() + hours * HOUR_MS);
}

export interface ApprovalLike {
  approverId: string;
  medical: boolean;
}

/** Can this approver validly approve this request? (returns a reason when not). */
export function canApprove(
  requesterId: string,
  approverId: string,
  approverRoles: string[],
  existing: ApprovalLike[],
): { ok: boolean; reason?: string } {
  if (approverId === requesterId) return { ok: false, reason: 'Requester cannot self-approve.' };
  if (approverRoles.some((r) => EXCLUDED_APPROVER_ROLES.includes(r))) {
    return { ok: false, reason: 'Platform staff cannot approve emergency access.' };
  }
  if (existing.some((a) => a.approverId === approverId)) {
    return { ok: false, reason: 'You have already approved this request.' };
  }
  return { ok: true };
}

export interface ActivationInput {
  scope: EmergencyScope;
  delayUntil: Date;
  approvals: ApprovalLike[];
  now: Date;
}

/** Are all conditions met to activate the grant? */
export function canActivate(input: ActivationInput): { ok: boolean; reason?: string } {
  if (input.approvals.length < MIN_APPROVERS) {
    return { ok: false, reason: `Needs at least ${String(MIN_APPROVERS)} approvals.` };
  }
  if (input.now.getTime() < input.delayUntil.getTime()) {
    return { ok: false, reason: 'Time-delay window has not elapsed.' };
  }
  if (input.scope === EmergencyScope.MEDICAL_ONLY) {
    const medical = input.approvals.filter((a) => a.medical).length;
    if (medical < 2) return { ok: false, reason: 'Medical-only expedite requires dual medical approval.' };
  }
  return { ok: true };
}
