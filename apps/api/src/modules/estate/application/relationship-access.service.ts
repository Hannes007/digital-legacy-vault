import { DocumentType, EmergencyScope } from '@dlv/shared-types';
import { Inject, Injectable } from '@nestjs/common';


import { CLOCK } from '../../../common/tokens';
import { DOCUMENT_REPOSITORY, type DocumentRepository } from '../../vault/application/ports';

import {
  CLIENT_RELATIONSHIP_READER,
  EMERGENCY_REPOSITORY,
  type ClientRelationshipReader,
  type EmergencyRepository,
} from './ports';

import type { Clock } from '../../../common/time/clock';

/** Document types a MEDICAL_ONLY emergency grant may reach. */
const MEDICAL_TYPES = new Set<string>([
  DocumentType.MEDICAL_DIRECTIVE,
  DocumentType.MEDICAL_RECORD,
  DocumentType.LIVING_WILL,
]);

export type AccessVia = 'owner' | 'emergency_grant' | 'client_relationship' | null;
export interface AccessDecision {
  allowed: boolean;
  via: AccessVia;
  reason?: string;
}

/**
 * Vault-relationship ABAC (roadmap Phase 4; extended Phase 8): resolves whether
 * a principal may read a specific document via ownership, an ACTIVE in-window
 * emergency grant, or an ACTIVE consent-gated professional client relationship —
 * each honouring its scope (FULL / CATEGORY / MEDICAL_ONLY). Deny by default.
 * Direct shares are a separate permission path (SecureLink / DocumentShare).
 */
@Injectable()
export class RelationshipAccessService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(EMERGENCY_REPOSITORY) private readonly emergency: EmergencyRepository,
    @Inject(CLIENT_RELATIONSHIP_READER) private readonly clientRelationships: ClientRelationshipReader,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canReadDocument(userId: string, documentId: string): Promise<AccessDecision> {
    const doc = await this.documents.findById(documentId);
    if (!doc) return { allowed: false, via: null, reason: 'Document not found.' };
    if (doc.ownerId === userId) return { allowed: true, via: 'owner' };

    const grants = await this.emergency.activeGrantsForGrantee(userId, this.clock.now());
    for (const g of grants) {
      if (g.ownerId !== doc.ownerId) continue;
      if (g.scope === EmergencyScope.FULL) return { allowed: true, via: 'emergency_grant' };
      if (g.scope === EmergencyScope.CATEGORY) {
        if (doc.categoryId && g.categoryIds.includes(doc.categoryId)) {
          return { allowed: true, via: 'emergency_grant' };
        }
      }
      if (g.scope === EmergencyScope.MEDICAL_ONLY && MEDICAL_TYPES.has(doc.type)) {
        return { allowed: true, via: 'emergency_grant' };
      }
    }
    const relationships = await this.clientRelationships.activeForProfessional(userId);
    for (const rel of relationships) {
      if (rel.clientUserId !== doc.ownerId) continue;
      if (rel.scope === EmergencyScope.FULL) return { allowed: true, via: 'client_relationship' };
      if (rel.scope === EmergencyScope.CATEGORY) {
        if (doc.categoryId && rel.categoryIds.includes(doc.categoryId)) {
          return { allowed: true, via: 'client_relationship' };
        }
      }
      if (rel.scope === EmergencyScope.MEDICAL_ONLY && MEDICAL_TYPES.has(doc.type)) {
        return { allowed: true, via: 'client_relationship' };
      }
    }
    return { allowed: false, via: null, reason: 'No ownership, active emergency grant, or professional relationship.' };
  }
}
