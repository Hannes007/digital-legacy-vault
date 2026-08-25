import { Injectable } from '@nestjs/common';


import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { EmailAlreadyRegisteredError } from '../domain/errors/identity.errors';

import type { CreateUserInput, UserRecord, UserRepository, UserStatus } from '../application/ports';
import type { Role } from '@dlv/shared-types';

/**
 * How a user + its identity-related relations are loaded in one query. Declared
 * once and reused so `findByEmail`/`findById` stay identical.
 */
const USER_INCLUDE = {
  passwordCredential: { select: { passwordHash: true } },
  roles: { select: { role: true } },
  totpSecret: { select: { status: true } },
  webauthnCredentials: { where: { revokedAt: null }, select: { id: true } },
} as const;

/**
 * Explicit shape of the joined row we map from. Kept independent of Prisma's
 * generated payload helpers so the mapper is stable across client regenerations
 * and easy to read; the Prisma query result is structurally assignable to it.
 */
interface UserRow {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: Date;
  passwordCredential: { passwordHash: string } | null;
  roles: { role: string }[];
  totpSecret: { status: string } | null;
  webauthnCredentials: { id: string }[];
}

/** Prisma error codes surface structurally; P2002 = unique-constraint violation. */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

/** Prisma-backed {@link UserRepository}. */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { email }, include: USER_INCLUDE });
    return row ? this.toRecord(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
    return row ? this.toRecord(row) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      const row = await this.prisma.user.create({
        data: {
          id: input.id,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          status: 'PENDING_VERIFICATION',
          passwordCredential: { create: { id: input.id, passwordHash: input.passwordHash } },
          roles: { create: { id: input.id, role: input.defaultRole } },
        },
        include: USER_INCLUDE,
      });
      return this.toRecord(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        // Unique email index — the authoritative guard against the register race.
        throw new EmailAlreadyRegisteredError();
      }
      throw err;
    }
  }

  async markEmailVerified(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: now } }),
      this.prisma.user.updateMany({
        where: { id: userId, status: 'PENDING_VERIFICATION' },
        data: { status: 'ACTIVE' },
      }),
    ]);
  }

  private toRecord(row: UserRow): UserRecord {
    return {
      id: row.id,
      email: row.email,
      emailVerifiedAt: row.emailVerifiedAt,
      firstName: row.firstName,
      lastName: row.lastName,
      status: row.status as UserStatus,
      roles: row.roles.map((r) => r.role as Role),
      passkeyCount: row.webauthnCredentials.length,
      totpEnabled: row.totpSecret?.status === 'ENABLED',
      passwordHash: row.passwordCredential?.passwordHash ?? null,
      createdAt: row.createdAt,
    };
  }
}
