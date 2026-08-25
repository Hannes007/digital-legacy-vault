import { SignatureMethod } from '@dlv/shared-types';
import { Injectable } from '@nestjs/common';


import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { CreateSignatureInput, SignatureRecord, SignatureRepository } from '../application/ports';
import type { SealEvidence } from '../domain/seal';

interface Row {
  id: string;
  requestId: string;
  signerUserId: string;
  method: string;
  signatureImageSha256: string;
  consentText: string;
  consentAcceptedAt: Date;
  documentVersionSha256: string;
  sealDigest: string;
  sealAlgorithm: string;
  tsaAuthority: string;
  tsaToken: string;
  tsaGenTime: Date;
  tsaImprintAlg: string;
  evidence: unknown;
  createdAt: Date;
}

const SELECT = {
  id: true,
  requestId: true,
  signerUserId: true,
  method: true,
  signatureImageSha256: true,
  consentText: true,
  consentAcceptedAt: true,
  documentVersionSha256: true,
  sealDigest: true,
  sealAlgorithm: true,
  tsaAuthority: true,
  tsaToken: true,
  tsaGenTime: true,
  tsaImprintAlg: true,
  evidence: true,
  createdAt: true,
} as const;

const map = (r: Row): SignatureRecord => ({
  ...r,
  method: r.method as SignatureMethod,
  evidence: r.evidence as SealEvidence,
});

@Injectable()
export class PrismaSignatureRepository implements SignatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSignatureInput): Promise<SignatureRecord> {
    const { evidence, ...rest } = input;
    return map(
      (await this.prisma.signature.create({
        data: { ...rest, evidence: evidence as unknown as object },
        select: SELECT,
      })) as Row,
    );
  }

  async findByRequest(requestId: string): Promise<SignatureRecord | null> {
    const row = (await this.prisma.signature.findFirst({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    })) as Row | null;
    return row ? map(row) : null;
  }

  async findById(id: string): Promise<SignatureRecord | null> {
    const row = (await this.prisma.signature.findUnique({ where: { id }, select: SELECT })) as Row | null;
    return row ? map(row) : null;
  }
}
