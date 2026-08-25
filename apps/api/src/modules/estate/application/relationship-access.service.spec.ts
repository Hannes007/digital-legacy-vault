import { DocumentStatus, DocumentType, EmergencyScope } from '@dlv/shared-types';

import { RelationshipAccessService } from './relationship-access.service';

import type {
  ActiveClientRelationship,
  ClientRelationshipReader,
  EmergencyGrantRecord,
  EmergencyRepository,
} from './ports';
import type { Clock } from '../../../common/time/clock';
import type { DocumentRecord, DocumentRepository } from '../../vault/application/ports';


const NOW = new Date('2026-07-07T00:00:00Z');

function doc(overrides: Partial<DocumentRecord>): DocumentRecord {
  return {
    id: 'doc-1', vaultId: 'v', ownerId: 'owner-1', title: 't', type: DocumentType.OTHER,
    status: DocumentStatus.READY, categoryId: null, currentVersion: 1, createdAt: NOW, updatedAt: NOW,
    ...overrides,
  };
}
function grant(overrides: Partial<EmergencyGrantRecord>): EmergencyGrantRecord {
  return {
    id: 'g', requestId: 'r', granteeId: 'grantee', ownerId: 'owner-1', scope: EmergencyScope.FULL,
    categoryIds: [], expiresAt: new Date('2026-08-01T00:00:00Z'), revokedAt: null, ...overrides,
  };
}
function svc(
  theDoc: DocumentRecord | null,
  grants: EmergencyGrantRecord[],
  relationships: ActiveClientRelationship[] = [],
): RelationshipAccessService {
  const documents = { findById: async () => theDoc } as unknown as DocumentRepository;
  const emergency = { activeGrantsForGrantee: async () => grants } as unknown as EmergencyRepository;
  const reader: ClientRelationshipReader = { activeForProfessional: async () => relationships };
  const clock: Clock = { now: () => NOW };
  return new RelationshipAccessService(documents, emergency, reader, clock);
}

describe('RelationshipAccessService (authz matrix)', () => {
  it('owner can always read their document', async () => {
    const d = await svc(doc({ ownerId: 'owner-1' }), []).canReadDocument('owner-1', 'doc-1');
    expect(d).toMatchObject({ allowed: true, via: 'owner' });
  });

  it('unrelated user with no grant is denied', async () => {
    const d = await svc(doc({}), []).canReadDocument('stranger', 'doc-1');
    expect(d.allowed).toBe(false);
  });

  it('FULL grant for the owner unlocks any document', async () => {
    const d = await svc(doc({}), [grant({ scope: EmergencyScope.FULL })]).canReadDocument('grantee', 'doc-1');
    expect(d).toMatchObject({ allowed: true, via: 'emergency_grant' });
  });

  it('CATEGORY grant only unlocks matching categories', async () => {
    const grants = [grant({ scope: EmergencyScope.CATEGORY, categoryIds: ['cat-A'] })];
    expect((await svc(doc({ categoryId: 'cat-A' }), grants).canReadDocument('grantee', 'doc-1')).allowed).toBe(true);
    expect((await svc(doc({ categoryId: 'cat-B' }), grants).canReadDocument('grantee', 'doc-1')).allowed).toBe(false);
  });

  it('MEDICAL_ONLY grant only unlocks medical document types', async () => {
    const grants = [grant({ scope: EmergencyScope.MEDICAL_ONLY })];
    expect((await svc(doc({ type: DocumentType.MEDICAL_DIRECTIVE }), grants).canReadDocument('grantee', 'doc-1')).allowed).toBe(true);
    expect((await svc(doc({ type: DocumentType.TAX }), grants).canReadDocument('grantee', 'doc-1')).allowed).toBe(false);
  });

  it('a grant for a different owner does not apply', async () => {
    const grants = [grant({ ownerId: 'other-owner', scope: EmergencyScope.FULL })];
    expect((await svc(doc({ ownerId: 'owner-1' }), grants).canReadDocument('grantee', 'doc-1')).allowed).toBe(false);
  });

  it('denies when the document does not exist', async () => {
    expect((await svc(null, []).canReadDocument('owner-1', 'missing')).allowed).toBe(false);
  });
});

describe('RelationshipAccessService — professional client relationships (Phase 8)', () => {
  it('FULL relationship with the owner unlocks any document', async () => {
    const d = await svc(doc({}), [], [
      { clientUserId: 'owner-1', scope: EmergencyScope.FULL, categoryIds: [] },
    ]).canReadDocument('lawyer-1', 'doc-1');
    expect(d).toMatchObject({ allowed: true, via: 'client_relationship' });
  });

  it('CATEGORY relationship only unlocks matching categories', async () => {
    const rels = [{ clientUserId: 'owner-1', scope: EmergencyScope.CATEGORY, categoryIds: ['cat-1'] }];
    const hit = await svc(doc({ categoryId: 'cat-1' }), [], rels).canReadDocument('adviser', 'doc-1');
    expect(hit.allowed).toBe(true);
    const miss = await svc(doc({ categoryId: 'cat-2' }), [], rels).canReadDocument('adviser', 'doc-1');
    expect(miss.allowed).toBe(false);
  });

  it('MEDICAL_ONLY relationship reaches medical documents only', async () => {
    const rels = [{ clientUserId: 'owner-1', scope: EmergencyScope.MEDICAL_ONLY, categoryIds: [] }];
    const med = await svc(doc({ type: DocumentType.MEDICAL_RECORD }), [], rels).canReadDocument('dr', 'doc-1');
    expect(med.allowed).toBe(true);
    const will = await svc(doc({ type: DocumentType.LAST_WILL }), [], rels).canReadDocument('dr', 'doc-1');
    expect(will.allowed).toBe(false);
  });

  it("a relationship with a DIFFERENT client does not unlock this owner's documents", async () => {
    const d = await svc(doc({ ownerId: 'owner-1' }), [], [
      { clientUserId: 'someone-else', scope: EmergencyScope.FULL, categoryIds: [] },
    ]).canReadDocument('lawyer-1', 'doc-1');
    expect(d.allowed).toBe(false);
  });
});
