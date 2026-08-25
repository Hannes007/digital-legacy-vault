import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';


import { CoreModule } from './common/core.module';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisThrottlerStorage } from './infrastructure/redis/redis-throttler.storage';
import { RedisModule } from './infrastructure/redis/redis.module';
import { RedisService } from './infrastructure/redis/redis.service';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { WellKnownModule } from './modules/well-known/well-known.module';
import { IdentityModule } from './modules/identity/identity.module';
import { VaultModule } from './modules/vault/vault.module';
import { SharingModule } from './modules/sharing/sharing.module';
import { EstateModule } from './modules/estate/estate.module';
import { SignatureModule } from './modules/signature/signature.module';
import { ConsentModule } from './modules/consent/consent.module';
import { LegalHoldModule } from './modules/legal-hold/legal-hold.module';
import { DataSubjectModule } from './modules/data-subject/data-subject.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { OrganisationModule } from './modules/organisation/organisation.module';
import { IntegrationModule } from './modules/integration/integration.module';

/**
 * Root module. Global infrastructure (config, clock/cipher, Prisma, Redis) is
 * imported once; feature contexts plug in on top. A global `ThrottlerGuard`
 * enforces a baseline request budget; per-route limits are set with `@Throttle`.
 */
@Module({
  imports: [
    ConfigModule,
    CoreModule,
    PrismaModule,
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    AuditModule,
    HealthModule,
    WellKnownModule,
    IdentityModule,
    VaultModule,
    SharingModule,
    EstateModule,
    SignatureModule,
    ConsentModule,
    LegalHoldModule,
    DataSubjectModule,
    BillingModule,
    NotificationModule,
    AdminModule,
    AiModule,
    OrganisationModule,
    IntegrationModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
