import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';

import { AdminService } from './application/admin.service';
import { ADMIN_REPOSITORY } from './application/ports';
import { PrismaAdminRepository } from './infrastructure/prisma-admin.repository';
import { AdminController } from './presentation/admin.controller';

/**
 * Admin back-office bounded context (Phase 6). Role-gated audit-trail search and
 * per-user support summaries; read-only, and every lookup is itself audited.
 */
@Module({
  imports: [AuditModule, IdentityModule],
  controllers: [AdminController],
  providers: [AdminService, { provide: ADMIN_REPOSITORY, useClass: PrismaAdminRepository }],
})
export class AdminModule {}
