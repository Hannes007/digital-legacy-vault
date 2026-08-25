import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';

import { ClientVaultService } from './application/client-vault.service';
import { DocumentRetentionService } from './application/document-retention.service';
import { DocumentService } from './application/document.service';
import {
  CATEGORY_REPOSITORY,
  CLIENT_VAULT_REPOSITORY,
  DOCUMENT_REPOSITORY,
  DOCUMENT_SEARCH_PORT,
  DOCUMENT_VERSION_REPOSITORY,
  KMS_PORT,
  OCR_PORT,
  SCANNER_PORT,
  STORAGE_PORT,
  TAG_REPOSITORY,
  UPLOAD_METADATA_STORE,
  VAULT_REPOSITORY,
} from './application/ports';
import { PromotionService } from './application/promotion.service';
import { SearchService } from './application/search.service';
import { TimelineService } from './application/timeline.service';
import { UploadService } from './application/upload.service';
import { ClamAvScannerAdapter } from './infrastructure/clamav-scanner.adapter';
import { KmsAdapter } from './infrastructure/kms.adapter';
import { OcrAdapter } from './infrastructure/ocr.adapter';
import { PgDocumentSearchAdapter } from './infrastructure/pg-document-search.adapter';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository';
import { PrismaClientVaultRepository } from './infrastructure/prisma-client-vault.repository';
import { PrismaDocumentRepository } from './infrastructure/prisma-document.repository';
import { PrismaDocumentVersionRepository } from './infrastructure/prisma-document-version.repository';
import { PrismaTagRepository } from './infrastructure/prisma-tag.repository';
import { PrismaVaultRepository } from './infrastructure/prisma-vault.repository';
import { RedisUploadMetadataStore } from './infrastructure/redis-upload-metadata.store';
import { S3StorageAdapter } from './infrastructure/s3-storage.adapter';
import { CategoriesController } from './presentation/categories.controller';
import { ClientVaultController } from './presentation/client-vault.controller';
import { DocumentsController } from './presentation/documents.controller';

/**
 * Vault bounded context (Phase 3). Upload pipeline (§7.5), envelope encryption,
 * versioning, categories/tags, OCR + FTS metadata search, timeline, and the
 * Client-Encrypted Vault. Imports BillingModule to enforce freemium storage /
 * document-count limits at upload time (Phase 6).
 */
@Module({
  imports: [AuditModule, IdentityModule, BillingModule],
  controllers: [DocumentsController, CategoriesController, ClientVaultController],
  providers: [
    UploadService,
    PromotionService,
    DocumentService,
    DocumentRetentionService,
    SearchService,
    TimelineService,
    ClientVaultService,
    { provide: STORAGE_PORT, useClass: S3StorageAdapter },
    { provide: KMS_PORT, useClass: KmsAdapter },
    { provide: SCANNER_PORT, useClass: ClamAvScannerAdapter },
    { provide: OCR_PORT, useClass: OcrAdapter },
    { provide: DOCUMENT_SEARCH_PORT, useClass: PgDocumentSearchAdapter },
    { provide: UPLOAD_METADATA_STORE, useClass: RedisUploadMetadataStore },
    { provide: DOCUMENT_REPOSITORY, useClass: PrismaDocumentRepository },
    { provide: DOCUMENT_VERSION_REPOSITORY, useClass: PrismaDocumentVersionRepository },
    { provide: VAULT_REPOSITORY, useClass: PrismaVaultRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
    { provide: TAG_REPOSITORY, useClass: PrismaTagRepository },
    { provide: CLIENT_VAULT_REPOSITORY, useClass: PrismaClientVaultRepository },
  ],
  exports: [DOCUMENT_REPOSITORY, DOCUMENT_VERSION_REPOSITORY, DocumentRetentionService],
})
export class VaultModule {}
