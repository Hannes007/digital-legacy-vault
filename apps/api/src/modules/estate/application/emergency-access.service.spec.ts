import { EmergencyScope, EmergencyStatus } from '@dlv/shared-types';

import { EmergencyAccessService } from './emergency-access.service';
import type {
  EmergencyApprovalRecord,
  EmergencyGrantRecord,
  EmergencyRepository,
  EmergencyRequestRecord,
  NotificationPort,
} from './ports';

import type { AuditService } from '../../audit/audit.service';
import type { Clock } from '../../../common/time/clock';

function makeRepo() {
  const state: { req?: EmergencyRequestRecord; approvals: EmergencyApprovalRecord[]; grant?: EmergencyGrantRecord } = {
    approvals: [],
  };
  const repo: EmergencyRepository = {
    createRequest: async (input) => {
      state.req = { ...input, createdAt: new Date() };
      return state.req;
    },
    findRequest: async () => state.req ?? null,
    listRequestsForOwner: async () => (state.req ? [state.req] : []),
    setRequestStatus: async (_id, status) => { if (state.req) state.req.status = status; },
    listApprovals: async () => state.approvals,
    addApproval: async (_id, approverId, medical) => void state.approvals.push({ approverId, medical }),
    createGrant: async (input) => { state.grant = { ...input, revokedAt: null }; return state.grant; },
    activeGrantsForGrantee: async () => [],
    revokeGrant: async () => undefined,
  };
  return { repo, state };
}

function makeService(nowRef: { now: Date }, repo: EmergencyRepository) {
  const notify: NotificationPort = { notifyOwner: async () => undefined };
  const clock: Clock = { now: () => nowRef.now };
  const audit = { record: async () => undefined } as unknown as AuditService;
  return new EmergencyAccessService(repo, notify, clock, audit);
}

describe('EmergencyAccessService', () => {
  it('creates a request with a 72h delay and notifies the owner', async () => {
    const nowRef = { now: new Date('2026-07-07T00:00:00Z') };
    const { repo, state } = makeRepo();
    const notify = { notifyOwner: jest.fn(async () => undefined) };
    const audit = { record: async () => undefined } as unknown as AuditService;
    const service = new EmergencyAccessService(repo, notify, { now: () => nowRef.now }, audit);

    const dto = await service.request('executor-1', { ownerId: 'owner-1', reason: 'estate settlement' });
    expect(dto.status).toBe(EmergencyStatus.REQUESTED);
    expect(new Date(dto.delayUntil).getTime() - nowRef.now.getTime()).toBe(72 * 3_600_000);
    expect(notify.notifyOwner).toHaveBeenCalled();
    expect(state.req?.requesterId).toBe('executor-1');
  });

  it('rejects self-access to your own vault', async () => {
    const nowRef = { now: new Date('2026-07-07T00:00:00Z') };
    const { repo } = makeRepo();
    const service = makeService(nowRef, repo);
    await expect(service.request('owner-1', { ownerId: 'owner-1', reason: 'x' })).rejects.toThrow();
  });

  it('blocks self-approval and enforces quorum + delay before activation', async () => {
    const nowRef = { now: new Date('2026-07-07T00:00:00Z') };
    const { repo } = makeRepo();
    const service = makeService(nowRef, repo);
    await service.request('executor-1', { ownerId: 'owner-1', reason: 'estate' });
    const id = (await repo.findRequest('x'))!.id;

    // requester cannot self-approve
    await expect(service.approve('executor-1', ['EXECUTOR'], id, false)).rejects.toThrow();
    // too early / not enough approvals
    await service.approve('appr-1', ['BENEFICIARY'], id, false);
    await expect(service.tryActivate(id)).rejects.toThrow();

    // second approver + delay elapsed → activates a read-only grant
    await service.approve('appr-2', ['LAWYER'], id, false);
    nowRef.now = new Date('2026-07-11T00:00:00Z'); // > 72h later
    const grant = await service.tryActivate(id);
    expect(grant.granteeId).toBe('executor-1');
    expect(new Date(grant.expiresAt).getTime()).toBeGreaterThan(nowRef.now.getTime());
  });
});
