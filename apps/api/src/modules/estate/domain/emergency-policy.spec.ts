import { EmergencyScope } from '@dlv/shared-types';

import {
  canActivate,
  canApprove,
  computeDelayUntil,
  DEATH_CLAIM_DELAY_HOURS,
  DEFAULT_DELAY_HOURS,
  MEDICAL_EXPEDITE_HOURS,
} from './emergency-policy';

const now = new Date('2026-07-07T00:00:00Z');
const hoursBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 3_600_000;

describe('emergency-policy', () => {
  describe('computeDelayUntil', () => {
    it('defaults to 72h for a standard request', () => {
      expect(hoursBetween(now, computeDelayUntil(now, { isDeathClaim: false, scope: EmergencyScope.FULL }))).toBe(DEFAULT_DELAY_HOURS);
    });
    it('uses 7 days for a death claim', () => {
      expect(hoursBetween(now, computeDelayUntil(now, { isDeathClaim: true, scope: EmergencyScope.FULL }))).toBe(DEATH_CLAIM_DELAY_HOURS);
    });
    it('expedites medical-only to 1h', () => {
      expect(hoursBetween(now, computeDelayUntil(now, { isDeathClaim: false, scope: EmergencyScope.MEDICAL_ONLY }))).toBe(MEDICAL_EXPEDITE_HOURS);
    });
    it('clamps an owner override into [24, 720]', () => {
      expect(hoursBetween(now, computeDelayUntil(now, { isDeathClaim: false, scope: EmergencyScope.FULL, ownerDelayHours: 5 }))).toBe(24);
      expect(hoursBetween(now, computeDelayUntil(now, { isDeathClaim: false, scope: EmergencyScope.FULL, ownerDelayHours: 9999 }))).toBe(720);
    });
    it('enforces the 48h death-claim floor', () => {
      expect(hoursBetween(now, computeDelayUntil(now, { isDeathClaim: true, scope: EmergencyScope.FULL, ownerDelayHours: 10 }))).toBe(48);
    });
  });

  describe('canApprove', () => {
    it('blocks self-approval', () => {
      expect(canApprove('u1', 'u1', ['EXECUTOR'], []).ok).toBe(false);
    });
    it('blocks platform staff', () => {
      expect(canApprove('u1', 'staff', ['SUPPORT_AGENT'], []).ok).toBe(false);
      expect(canApprove('u1', 'admin', ['SYSTEM_ADMIN'], []).ok).toBe(false);
    });
    it('blocks a duplicate approval', () => {
      expect(canApprove('u1', 'a2', ['EXECUTOR'], [{ approverId: 'a2', medical: false }]).ok).toBe(false);
    });
    it('allows a valid distinct approver', () => {
      expect(canApprove('u1', 'a2', ['EXECUTOR'], []).ok).toBe(true);
    });
  });

  describe('canActivate', () => {
    const elapsed = new Date('2026-07-11T00:00:00Z'); // > 72h later
    it('requires the minimum approver quorum', () => {
      expect(canActivate({ scope: EmergencyScope.FULL, delayUntil: now, approvals: [{ approverId: 'a', medical: false }], now: elapsed }).ok).toBe(false);
    });
    it('requires the delay window to elapse', () => {
      const future = new Date('2026-07-20T00:00:00Z');
      expect(canActivate({ scope: EmergencyScope.FULL, delayUntil: future, approvals: [{ approverId: 'a', medical: false }, { approverId: 'b', medical: false }], now }).ok).toBe(false);
    });
    it('activates a standard request with quorum after the delay', () => {
      expect(canActivate({ scope: EmergencyScope.FULL, delayUntil: now, approvals: [{ approverId: 'a', medical: false }, { approverId: 'b', medical: false }], now: elapsed }).ok).toBe(true);
    });
    it('requires dual medical approval for a medical-only expedite', () => {
      const oneMed = [{ approverId: 'a', medical: true }, { approverId: 'b', medical: false }];
      expect(canActivate({ scope: EmergencyScope.MEDICAL_ONLY, delayUntil: now, approvals: oneMed, now: elapsed }).ok).toBe(false);
      const twoMed = [{ approverId: 'a', medical: true }, { approverId: 'b', medical: true }];
      expect(canActivate({ scope: EmergencyScope.MEDICAL_ONLY, delayUntil: now, approvals: twoMed, now: elapsed }).ok).toBe(true);
    });
  });
});
