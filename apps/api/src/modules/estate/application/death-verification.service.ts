import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { DeathVerificationStatus, Role, type DeathVerificationDto } from '@dlv/shared-types';

import { AuditService } from '../../audit/audit.service';
import { DEATH_VERIFICATION_REPOSITORY, type DeathVerificationRecord, type DeathVerificationRepository } from './ports';

// Roles permitted to review death claims (manual dual review at launch, §9).
const VERIFIER_ROLES: Role[] = [Role.SUPPORT_AGENT, Role.SYSTEM_ADMIN, Role.SUPER_ADMIN];

@Injectable()
export class DeathVerificationService {
  constructor(
    @Inject(DEATH_VERIFICATION_REPOSITORY) private readonly repo: DeathVerificationRepository,
    private readonly audit: AuditService,
  ) {}

  async submit(claimantId: string, subjectUserId: string, evidenceDocIds: string[]): Promise<DeathVerificationDto> {
    const rec = await this.repo.create({ id: uuidv7(), subjectUserId, claimantId, evidenceDocIds });
    await this.audit.record({ actorUserId: claimantId, eventType: 'death_verification.submitted', resource: `user:${subjectUserId}`, payload: { verificationId: rec.id } });
    return toDto(rec);
  }

  async listPending(reviewerRoles: Role[]): Promise<DeathVerificationDto[]> {
    this.assertVerifier(reviewerRoles);
    const pending = [
      ...(await this.repo.listByStatus(DeathVerificationStatus.SUBMITTED)),
      ...(await this.repo.listByStatus(DeathVerificationStatus.UNDER_REVIEW)),
    ];
    return pending.map(toDto);
  }

  async review(
    reviewerId: string,
    reviewerRoles: Role[],
    id: string,
    approve: boolean,
    notes: string | null,
  ): Promise<void> {
    this.assertVerifier(reviewerRoles);
    const rec = await this.repo.findById(id);
    if (!rec) throw new NotFoundException('Verification not found.');
    const status = approve ? DeathVerificationStatus.VERIFIED : DeathVerificationStatus.REJECTED;
    await this.repo.setDecision(id, status, reviewerId, notes);
    await this.audit.record({
      actorUserId: reviewerId,
      eventType: approve ? 'death_verification.verified' : 'death_verification.rejected',
      resource: `user:${rec.subjectUserId}`,
      payload: { verificationId: id },
    });
    // On VERIFIED, the death-claim emergency flow (7-day delay) may proceed for
    // designated executors/beneficiaries.
  }

  private assertVerifier(roles: Role[]): void {
    if (!roles.some((r) => VERIFIER_ROLES.includes(r))) {
      throw new ForbiddenException('Only authorised verifiers may review death claims.');
    }
  }
}
function toDto(r: DeathVerificationRecord): DeathVerificationDto {
  return {
    id: r.id, subjectUserId: r.subjectUserId, claimantId: r.claimantId, evidenceDocIds: r.evidenceDocIds,
    status: r.status, reviewerId: r.reviewerId, reviewNotes: r.reviewNotes, createdAt: r.createdAt.toISOString(),
  };
}
