import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { EmergencyScope, EmergencyStatus } from '@dlv/shared-types';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  EmergencyApprovalRecord,
  EmergencyGrantRecord,
  EmergencyRepository,
  EmergencyRequestRecord,
} from '../application/ports';

interface ReqRow {
  id: string; ownerId: string; requesterId: string; scope: string; categoryIds: string[];
  reason: string; isDeathClaim: boolean; status: string; delayUntil: Date; createdAt: Date;
}
const REQ_SELECT = { id: true, ownerId: true, requesterId: true, scope: true, categoryIds: true, reason: true, isDeathClaim: true, status: true, delayUntil: true, createdAt: true } as const;
const mapReq = (r: ReqRow): EmergencyRequestRecord => ({ ...r, scope: r.scope as EmergencyScope, status: r.status as EmergencyStatus });

interface GrantRow {
  id: string; requestId: string; granteeId: string; ownerId: string; scope: string; categoryIds: string[]; expiresAt: Date; revokedAt: Date | null;
}
const GRANT_SELECT = { id: true, requestId: true, granteeId: true, ownerId: true, scope: true, categoryIds: true, expiresAt: true, revokedAt: true } as const;
const mapGrant = (r: GrantRow): EmergencyGrantRecord => ({ ...r, scope: r.scope as EmergencyScope });

@Injectable()
export class PrismaEmergencyRepository implements EmergencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(input: Omit<EmergencyRequestRecord, 'createdAt' | 'status'> & { status: EmergencyStatus }): Promise<EmergencyRequestRecord> {
    return mapReq((await this.prisma.emergencyAccessRequest.create({
      data: {
        id: input.id, ownerId: input.ownerId, requesterId: input.requesterId, scope: input.scope,
        categoryIds: input.categoryIds, reason: input.reason, isDeathClaim: input.isDeathClaim,
        status: input.status, delayUntil: input.delayUntil,
      },
      select: REQ_SELECT,
    })) as ReqRow);
  }
  async findRequest(id: string): Promise<EmergencyRequestRecord | null> {
    const r = (await this.prisma.emergencyAccessRequest.findUnique({ where: { id }, select: REQ_SELECT })) as ReqRow | null;
    return r ? mapReq(r) : null;
  }
  async listRequestsForOwner(ownerId: string): Promise<EmergencyRequestRecord[]> {
    return ((await this.prisma.emergencyAccessRequest.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' }, select: REQ_SELECT })) as ReqRow[]).map(mapReq);
  }
  async setRequestStatus(id: string, status: EmergencyStatus): Promise<void> {
    await this.prisma.emergencyAccessRequest.update({ where: { id }, data: { status, decidedAt: new Date() } });
  }
  async listApprovals(requestId: string): Promise<EmergencyApprovalRecord[]> {
    return (await this.prisma.emergencyApproval.findMany({ where: { requestId }, select: { approverId: true, medical: true } })) as EmergencyApprovalRecord[];
  }
  async addApproval(requestId: string, approverId: string, medical: boolean): Promise<void> {
    await this.prisma.emergencyApproval.upsert({
      where: { requestId_approverId: { requestId, approverId } },
      update: {},
      create: { id: uuidv7(), requestId, approverId, medical },
    });
  }
  async createGrant(input: Omit<EmergencyGrantRecord, 'revokedAt'>): Promise<EmergencyGrantRecord> {
    return mapGrant((await this.prisma.emergencyAccessGrant.create({
      data: {
        id: input.id, requestId: input.requestId, granteeId: input.granteeId, ownerId: input.ownerId,
        scope: input.scope, categoryIds: input.categoryIds, expiresAt: input.expiresAt,
      },
      select: GRANT_SELECT,
    })) as GrantRow);
  }
  async activeGrantsForGrantee(granteeId: string, now: Date): Promise<EmergencyGrantRecord[]> {
    return ((await this.prisma.emergencyAccessGrant.findMany({
      where: { granteeId, revokedAt: null, expiresAt: { gt: now } },
      select: GRANT_SELECT,
    })) as GrantRow[]).map(mapGrant);
  }
  async revokeGrant(id: string, at: Date): Promise<void> {
    await this.prisma.emergencyAccessGrant.update({ where: { id }, data: { revokedAt: at } });
  }
}
