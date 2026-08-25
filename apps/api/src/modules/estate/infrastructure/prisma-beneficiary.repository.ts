import { Injectable } from '@nestjs/common';
import { RelationshipRole } from '@dlv/shared-types';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { BeneficiaryRecord, BeneficiaryRepository } from '../application/ports';

interface Row { id: string; ownerId: string; fullName: string; email: string; relationship: string; role: string; createdAt: Date; }
const SELECT = { id: true, ownerId: true, fullName: true, email: true, relationship: true, role: true, createdAt: true } as const;
const map = (r: Row): BeneficiaryRecord => ({ ...r, role: r.role as RelationshipRole });

@Injectable()
export class PrismaBeneficiaryRepository implements BeneficiaryRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(input: { id: string; ownerId: string; fullName: string; email: string; relationship: string; role: RelationshipRole }): Promise<BeneficiaryRecord> {
    return map((await this.prisma.beneficiary.create({ data: input, select: SELECT })) as Row);
  }
  async listByOwner(ownerId: string): Promise<BeneficiaryRecord[]> {
    return ((await this.prisma.beneficiary.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' }, select: SELECT })) as Row[]).map(map);
  }
  async delete(ownerId: string, id: string): Promise<void> {
    await this.prisma.beneficiary.deleteMany({ where: { id, ownerId } });
  }
}
