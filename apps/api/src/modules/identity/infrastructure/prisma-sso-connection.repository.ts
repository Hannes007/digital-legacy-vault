import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type {
  SsoConnectionRecord,
  SsoConnectionRepository,
  UpsertSsoConnectionInput,
} from '../application/sso-ports';

/** Prisma adapter for per-organisation SSO connections (Phase 8). */
@Injectable()
export class PrismaSsoConnectionRepository implements SsoConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrg(organisationId: string): Promise<SsoConnectionRecord | null> {
    return (await this.prisma.ssoConnection.findUnique({
      where: { organisationId },
    })) as SsoConnectionRecord | null;
  }

  async findEnabledByEmailDomain(domain: string): Promise<SsoConnectionRecord | null> {
    return (await this.prisma.ssoConnection.findFirst({
      where: { enabled: true, emailDomains: { has: domain } },
    })) as SsoConnectionRecord | null;
  }

  async upsert(input: UpsertSsoConnectionInput): Promise<SsoConnectionRecord> {
    const { clientSecretEnc, id, organisationId, ...rest } = input;
    const update = clientSecretEnc === null ? rest : { ...rest, clientSecretEnc };
    return (await this.prisma.ssoConnection.upsert({
      where: { organisationId },
      create: { id, organisationId, ...rest, clientSecretEnc: clientSecretEnc ?? '' },
      update,
    })) as SsoConnectionRecord;
  }
}
