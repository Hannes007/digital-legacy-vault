import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import type { ClientVaultItemDto, CreateClientVaultItemRequest } from '@dlv/shared-types';

import { AuditService } from '../../audit/audit.service';
import {
  CLIENT_VAULT_REPOSITORY,
  type ClientVaultRecord,
  type ClientVaultRepository,
} from './ports';

/**
 * Client-Encrypted Vault (zero-knowledge). The server only ever stores and
 * returns ciphertext + IV produced in the browser; it never sees the vault key
 * or plaintext. Recovery is handled entirely client-side via Shamir shares.
 */
@Injectable()
export class ClientVaultService {
  constructor(
    @Inject(CLIENT_VAULT_REPOSITORY) private readonly repo: ClientVaultRepository,
    private readonly audit: AuditService,
  ) {}

  async create(ownerId: string, req: CreateClientVaultItemRequest): Promise<ClientVaultItemDto> {
    const created = await this.repo.create({
      id: uuidv7(),
      ownerId,
      label: req.label,
      ciphertext: req.ciphertext,
      iv: req.iv,
    });
    await this.audit.record({
      actorUserId: ownerId,
      eventType: 'client_vault.item.created',
      resource: `client_vault_item:${created.id}`,
      payload: { label: req.label },
    });
    return toDto(created);
  }

  async list(ownerId: string): Promise<ClientVaultItemDto[]> {
    return (await this.repo.listByOwner(ownerId)).map(toDto);
  }

  async get(ownerId: string, id: string): Promise<ClientVaultItemDto> {
    const item = await this.requireOwned(ownerId, id);
    return toDto(item);
  }

  async delete(ownerId: string, id: string): Promise<void> {
    await this.requireOwned(ownerId, id);
    await this.repo.delete(id);
  }

  private async requireOwned(ownerId: string, id: string): Promise<ClientVaultRecord> {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Item not found.');
    if (item.ownerId !== ownerId) throw new ForbiddenException('Not your item.');
    return item;
  }
}

function toDto(r: ClientVaultRecord): ClientVaultItemDto {
  return {
    id: r.id,
    ownerId: r.ownerId,
    label: r.label,
    ciphertext: r.ciphertext,
    iv: r.iv,
    createdAt: r.createdAt.toISOString(),
  };
}
