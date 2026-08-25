import { SignatureRequestStatus } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';


import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type {
  CreateSignatureRequestInput,
  SignatureRequestRecord,
  SignatureRequestRepository,
} from '../application/ports';

interface Row {
  id: string;
  documentId: string;
  ownerId: string;
  title: string;
  message: string | null;
  status: string;
  signerUserId: string | null;
  signerName: string;
  signerEmail: string;
  expiresAt: Date;
  createdAt: Date;
  completedAt: Date | null;
}

const SELECT = {
  id: true,
  documentId: true,
  ownerId: true,
  title: true,
  message: true,
  status: true,
  signerUserId: true,
  signerName: true,
  signerEmail: true,
  expiresAt: true,
  createdAt: true,
  completedAt: true,
} as const;

const map = (r: Row): SignatureRequestRecord => ({
  ...r,
  status: r.status as SignatureRequestStatus,
});

@Injectable()
export class PrismaSignatureRequestRepository implements SignatureRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSignatureRequestInput): Promise<SignatureRequestRecord> {
    return map((await this.prisma.signatureRequest.create({ data: input, select: SELECT })) as Row);
  }

  async findById(id: string): Promise<SignatureRequestRecord | null> {
    const row = (await this.prisma.signatureRequest.findUnique({ where: { id }, select: SELECT })) as Row | null;
    return row ? map(row) : null;
  }

  async listByOwner(ownerId: string): Promise<SignatureRequestRecord[]> {
    return ((await this.prisma.signatureRequest.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    })) as Row[]).map(map);
  }

  async setStatus(id: string, status: SignatureRequestStatus, completedAt: Date | null): Promise<void> {
    await this.prisma.signatureRequest.update({ where: { id }, data: { status, completedAt } });
  }
}
