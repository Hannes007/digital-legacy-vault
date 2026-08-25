import {
  ClientRelationshipStatus,
  ConsentPurpose,
  EmergencyScope,
} from '@dlv/shared-types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import { CONSENT_RECORDER } from '../../consent/application/ports';
import { canRequestClientAccess, isOrgAdmin } from '../domain/relationship-policy';

import { CLIENT_RELATIONSHIP_REPOSITORY, ORG_DIRECTORY_PORT } from './ports';

import type {
  ClientRelationshipRepository,
  ClientRelationshipView,
  OrgDirectoryPort,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { ConsentRecorder } from '../../consent/application/ports';
import type { ClientRelationshipDto } from '@dlv/shared-types';

function toDto(v: ClientRelationshipView): ClientRelationshipDto {
  return {
    id: v.id,
    organisationId: v.organisationId,
    organisationName: v.organisationName,
    professionalUserId: v.professionalUserId,
    professionalName: v.professionalName,
    clientUserId: v.clientUserId,
    clientEmail: v.clientEmail,
    role: v.role,
    scope: v.scope,
    categoryIds: v.categoryIds,
    status: v.status,
    createdAt: v.createdAt.toISOString(),
    respondedAt: v.respondedAt ? v.respondedAt.toISOString() : null,
  };
}

/**
 * Professional↔client vault relationships (Phase 8): a LAWYER / DOCTOR /
 * FINANCIAL_ADVISER member of an organisation requests scoped read access to a
 * client's vault; nothing is granted until the client accepts — their consent
 * is recorded first-class (POPIA) and the grant is enforced by the estate
 * vault-relationship ABAC. Deny by default; every transition audited.
 */
@Injectable()
export class ClientRelationshipService {
  constructor(
    @Inject(CLIENT_RELATIONSHIP_REPOSITORY) private readonly relationships: ClientRelationshipRepository,
    @Inject(ORG_DIRECTORY_PORT) private readonly directory: OrgDirectoryPort,
    @Inject(CONSENT_RECORDER) private readonly consent: ConsentRecorder,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  async request(
    organisationId: string,
    professionalUserId: string,
    clientEmail: string,
    scope: EmergencyScope,
    categoryIds: string[],
  ): Promise<void> {
    const membership = await this.directory.membership(organisationId, professionalUserId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('You are not an active member of this organisation.');
    }
    if (!canRequestClientAccess(membership.role)) {
      throw new ForbiddenException('Only professional members can request client access.');
    }
    if (scope === EmergencyScope.CATEGORY && categoryIds.length === 0) {
      throw new BadRequestException('Category scope requires at least one category.');
    }
    const clientUserId = await this.directory.findUserIdByEmail(clientEmail.toLowerCase());
    // No enumeration: the response is identical whether or not the account exists.
    if (!clientUserId) return;
    if (clientUserId === professionalUserId) {
      throw new BadRequestException('You cannot request access to your own vault.');
    }
    if (await this.relationships.existsOpen(organisationId, professionalUserId, clientUserId)) {
      throw new ConflictException('A pending or active relationship already exists for this client.');
    }

    const record = await this.relationships.create({
      id: uuidv7(),
      organisationId,
      professionalUserId,
      clientUserId,
      role: membership.role,
      scope,
      categoryIds,
    });
    await this.audit.record({
      actorUserId: professionalUserId,
      eventType: 'organisation.client_access.requested',
      resource: `client_relationship:${record.id}`,
      payload: { organisationId, scope, categoryCount: categoryIds.length },
    });
  }

  async listForOrg(organisationId: string, userId: string): Promise<ClientRelationshipDto[]> {
    const membership = await this.directory.membership(organisationId, userId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('You are not an active member of this organisation.');
    }
    const all = await this.relationships.listByOrg(organisationId);
    const visible = isOrgAdmin(membership.role)
      ? all
      : all.filter((r) => r.professionalUserId === userId);
    return visible.map(toDto);
  }

  async listForClient(clientUserId: string): Promise<ClientRelationshipDto[]> {
    return (await this.relationships.listByClient(clientUserId)).map(toDto);
  }

  async respond(
    relationshipId: string,
    clientUserId: string,
    accept: boolean,
    scope?: EmergencyScope,
    categoryIds?: string[],
  ): Promise<void> {
    const record = await this.relationships.findById(relationshipId);
    if (!record) throw new NotFoundException('Access request not found.');
    if (record.clientUserId !== clientUserId) {
      throw new ForbiddenException('Only the vault owner can respond to this request.');
    }
    if (record.status !== ClientRelationshipStatus.PENDING) {
      throw new ConflictException('This request has already been answered.');
    }

    const now = this.clock.now();
    const finalScope = scope ?? record.scope;
    const finalCategories = finalScope === EmergencyScope.CATEGORY ? (categoryIds ?? record.categoryIds) : [];
    if (finalScope === EmergencyScope.CATEGORY && finalCategories.length === 0) {
      throw new BadRequestException('Category scope requires at least one category.');
    }

    if (accept) {
      await this.consent.record({
        userId: clientUserId,
        purpose: ConsentPurpose.DATA_PROCESSING,
        statementText:
          'I grant this professional read access to my vault documents within the scope I selected. I can withdraw this at any time.',
        sourceContext: `client-relationship:${record.id}`,
        grantedAt: now,
      });
    }
    await this.relationships.respond(
      relationshipId,
      accept ? ClientRelationshipStatus.ACTIVE : ClientRelationshipStatus.DECLINED,
      finalScope,
      finalCategories,
      now,
    );
    await this.audit.record({
      actorUserId: clientUserId,
      eventType: accept
        ? 'organisation.client_access.accepted'
        : 'organisation.client_access.declined',
      resource: `client_relationship:${relationshipId}`,
      payload: { scope: finalScope, categoryCount: finalCategories.length },
    });
  }

  /** Revocation: the client, the professional themself, or an org admin. */
  async revoke(relationshipId: string, actorUserId: string): Promise<void> {
    const record = await this.relationships.findById(relationshipId);
    if (!record) throw new NotFoundException('Relationship not found.');
    let allowed = record.clientUserId === actorUserId || record.professionalUserId === actorUserId;
    if (!allowed) {
      const membership = await this.directory.membership(record.organisationId, actorUserId);
      allowed = membership !== null && membership.status === 'ACTIVE' && isOrgAdmin(membership.role);
    }
    if (!allowed) throw new ForbiddenException('You cannot revoke this relationship.');
    if (record.status === ClientRelationshipStatus.REVOKED) return;

    await this.relationships.revoke(relationshipId, this.clock.now());
    await this.audit.record({
      actorUserId,
      eventType: 'organisation.client_access.revoked',
      resource: `client_relationship:${relationshipId}`,
      payload: { organisationId: record.organisationId },
    });
  }
}
