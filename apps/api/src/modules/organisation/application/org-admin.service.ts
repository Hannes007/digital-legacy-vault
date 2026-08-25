import { DATA_REGIONS } from '@dlv/shared-types';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CLOCK } from '../../../common/tokens';
import { AuditService } from '../../audit/audit.service';
import { isOrgAdmin } from '../domain/relationship-policy';

import { CLIENT_RELATIONSHIP_REPOSITORY, ORG_DIRECTORY_PORT, ORG_USAGE_PORT } from './ports';

import type { ClientRelationshipRepository, OrgDirectoryPort, OrgUsagePort } from './ports';
import type { Clock } from '../../../common/time/clock';
import type { DataRegion, OrgUsageDto, ResidencyDto } from '@dlv/shared-types';

/**
 * Org-admin workspace services (Phase 8): usage metering for org billing and
 * data-residency controls (PROJECT_MEMORY §2.3 — af-south-1 primary,
 * eu-west-1 DR/EU). Residency changes are audited; physical data placement
 * enforcement is infra-level (Terraform/S3/CRR), this is the control surface.
 */
@Injectable()
export class OrgAdminService {
  constructor(
    @Inject(ORG_DIRECTORY_PORT) private readonly directory: OrgDirectoryPort,
    @Inject(ORG_USAGE_PORT) private readonly usagePort: OrgUsagePort,
    @Inject(CLIENT_RELATIONSHIP_REPOSITORY) private readonly relationships: ClientRelationshipRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly audit: AuditService,
  ) {}

  private async assertAdmin(organisationId: string, userId: string): Promise<void> {
    const membership = await this.directory.membership(organisationId, userId);
    if (!membership || membership.status !== 'ACTIVE' || !isOrgAdmin(membership.role)) {
      throw new ForbiddenException('Organisation administrator access required.');
    }
  }

  private monthStart(): Date {
    const now = this.clock.now();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  async usage(organisationId: string, userId: string): Promise<OrgUsageDto> {
    await this.assertAdmin(organisationId, userId);
    const snap = await this.usagePort.snapshot(organisationId, this.monthStart());
    return { organisationId, ...snap };
  }

  async residency(organisationId: string, userId: string): Promise<ResidencyDto> {
    await this.assertAdmin(organisationId, userId);
    const org = await this.directory.findOrg(organisationId);
    if (!org) throw new NotFoundException('Organisation not found.');
    return {
      organisationId,
      dataRegion: org.dataRegion as DataRegion,
      availableRegions: [...DATA_REGIONS],
    };
  }

  async updateResidency(
    organisationId: string,
    userId: string,
    dataRegion: string,
  ): Promise<ResidencyDto> {
    await this.assertAdmin(organisationId, userId);
    if (!(DATA_REGIONS as readonly string[]).includes(dataRegion)) {
      throw new BadRequestException(`dataRegion must be one of: ${DATA_REGIONS.join(', ')}`);
    }
    const org = await this.directory.findOrg(organisationId);
    if (!org) throw new NotFoundException('Organisation not found.');
    if (org.dataRegion !== dataRegion) {
      await this.directory.updateDataRegion(organisationId, dataRegion);
      await this.audit.record({
        actorUserId: userId,
        eventType: 'organisation.residency.updated',
        resource: `organisation:${organisationId}`,
        payload: { from: org.dataRegion, to: dataRegion },
      });
    }
    return this.residency(organisationId, userId);
  }
}
