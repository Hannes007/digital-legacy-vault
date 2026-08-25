import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { RelationshipRole, type ExecutorDto } from '@dlv/shared-types';

import { AuditService } from '../../audit/audit.service';
import { EXECUTOR_REPOSITORY, type ExecutorRecord, type ExecutorRepository } from './ports';

@Injectable()
export class ExecutorService {
  constructor(
    @Inject(EXECUTOR_REPOSITORY) private readonly repo: ExecutorRepository,
    private readonly audit: AuditService,
  ) {}

  async add(ownerId: string, input: { fullName: string; email: string }): Promise<ExecutorDto> {
    const rec = await this.repo.create({ id: uuidv7(), ownerId, fullName: input.fullName, email: input.email.toLowerCase(), role: RelationshipRole.EXECUTOR });
    await this.audit.record({ actorUserId: ownerId, eventType: 'executor.added', resource: `user:${ownerId}`, payload: { executorId: rec.id } });
    return toDto(rec);
  }
  async list(ownerId: string): Promise<ExecutorDto[]> {
    return (await this.repo.listByOwner(ownerId)).map(toDto);
  }
  async remove(ownerId: string, id: string): Promise<void> {
    await this.repo.delete(ownerId, id);
    await this.audit.record({ actorUserId: ownerId, eventType: 'executor.removed', resource: `user:${ownerId}`, payload: { executorId: id } });
  }
}
function toDto(r: ExecutorRecord): ExecutorDto {
  return { id: r.id, ownerId: r.ownerId, fullName: r.fullName, email: r.email, role: r.role, createdAt: r.createdAt.toISOString() };
}
