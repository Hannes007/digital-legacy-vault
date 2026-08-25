import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { RelationshipRole, type BeneficiaryDto } from '@dlv/shared-types';

import { AuditService } from '../../audit/audit.service';
import { BENEFICIARY_REPOSITORY, type BeneficiaryRecord, type BeneficiaryRepository } from './ports';

@Injectable()
export class BeneficiaryService {
  constructor(
    @Inject(BENEFICIARY_REPOSITORY) private readonly repo: BeneficiaryRepository,
    private readonly audit: AuditService,
  ) {}

  async add(ownerId: string, input: { fullName: string; email: string; relationship: string; role?: RelationshipRole }): Promise<BeneficiaryDto> {
    const rec = await this.repo.create({
      id: uuidv7(), ownerId, fullName: input.fullName, email: input.email.toLowerCase(),
      relationship: input.relationship, role: input.role ?? RelationshipRole.BENEFICIARY,
    });
    await this.audit.record({ actorUserId: ownerId, eventType: 'beneficiary.added', resource: `user:${ownerId}`, payload: { beneficiaryId: rec.id } });
    return toDto(rec);
  }
  async list(ownerId: string): Promise<BeneficiaryDto[]> {
    return (await this.repo.listByOwner(ownerId)).map(toDto);
  }
  async remove(ownerId: string, id: string): Promise<void> {
    await this.repo.delete(ownerId, id);
    await this.audit.record({ actorUserId: ownerId, eventType: 'beneficiary.removed', resource: `user:${ownerId}`, payload: { beneficiaryId: id } });
  }
}
function toDto(r: BeneficiaryRecord): BeneficiaryDto {
  return { id: r.id, ownerId: r.ownerId, fullName: r.fullName, email: r.email, relationship: r.relationship, role: r.role, createdAt: r.createdAt.toISOString() };
}
