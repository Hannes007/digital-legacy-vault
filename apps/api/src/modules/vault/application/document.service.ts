import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import type {
  DocumentCategoryDto,
  DocumentDto,
  DocumentType,
  DocumentVersionDto,
} from '@dlv/shared-types';

import { AuditService } from '../../audit/audit.service';
import {
  CATEGORY_REPOSITORY,
  DOCUMENT_REPOSITORY,
  DOCUMENT_VERSION_REPOSITORY,
  TAG_REPOSITORY,
  type CategoryRepository,
  type DocumentRecord,
  type DocumentRepository,
  type DocumentVersionRecord,
  type DocumentVersionRepository,
  type TagRepository,
} from './ports';

@Injectable()
export class DocumentService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(DOCUMENT_VERSION_REPOSITORY) private readonly versions: DocumentVersionRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(TAG_REPOSITORY) private readonly tags: TagRepository,
    private readonly audit: AuditService,
  ) {}

  async list(ownerId: string): Promise<DocumentDto[]> {
    const docs = await this.documents.listByOwner(ownerId);
    return Promise.all(docs.map((d) => this.toDto(d)));
  }

  async get(ownerId: string, id: string): Promise<DocumentDto> {
    const doc = await this.requireOwned(ownerId, id);
    return this.toDto(doc);
  }

  async listVersions(ownerId: string, id: string): Promise<DocumentVersionDto[]> {
    await this.requireOwned(ownerId, id);
    const versions = await this.versions.listByDocument(id);
    return versions.map(toVersionDto);
  }

  async addTag(ownerId: string, id: string, label: string): Promise<void> {
    await this.requireOwned(ownerId, id);
    await this.tags.attach({ ownerId, documentId: id, label, tagId: uuidv7() });
    await this.audit.record({
      actorUserId: ownerId,
      eventType: 'document.tag.added',
      resource: `document:${id}`,
      payload: { label },
    });
  }

  async setCategory(ownerId: string, id: string, categoryId: string | null): Promise<void> {
    await this.requireOwned(ownerId, id);
    await this.documents.setCategory(id, categoryId);
  }

  async createCategory(ownerId: string, name: string): Promise<DocumentCategoryDto> {
    const created = await this.categories.create({ id: uuidv7(), ownerId, name });
    return { id: created.id, name: created.name, documentCount: 0 };
  }

  async listCategories(ownerId: string): Promise<DocumentCategoryDto[]> {
    const rows = await this.categories.listByOwner(ownerId);
    return rows.map((r) => ({ id: r.id, name: r.name, documentCount: r.documentCount }));
  }

  private async requireOwned(ownerId: string, id: string): Promise<DocumentRecord> {
    const doc = await this.documents.findById(id);
    if (!doc) throw new NotFoundException('Document not found.');
    if (doc.ownerId !== ownerId) throw new ForbiddenException('Not your document.');
    return doc;
  }

  private async toDto(doc: DocumentRecord): Promise<DocumentDto> {
    const [versions, tagLabels] = await Promise.all([
      this.versions.listByDocument(doc.id),
      this.tags.listLabels(doc.id),
    ]);
    const current = versions.find((v) => v.version === doc.currentVersion);
    return {
      id: doc.id,
      vaultId: doc.vaultId,
      ownerId: doc.ownerId,
      title: doc.title,
      type: doc.type as DocumentType,
      status: doc.status,
      categoryId: doc.categoryId,
      tags: tagLabels,
      currentVersion: doc.currentVersion,
      sizeBytes: current?.sizeBytes ?? 0,
      mimeType: current?.mimeType ?? 'application/octet-stream',
      sha256: current?.sha256 ?? '',
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}

function toVersionDto(v: DocumentVersionRecord): DocumentVersionDto {
  return {
    id: v.id,
    documentId: v.documentId,
    version: v.version,
    sizeBytes: v.sizeBytes,
    sha256: v.sha256,
    mimeType: v.mimeType,
    scanVerdict: v.scanVerdict,
    createdAt: v.createdAt.toISOString(),
  };
}
