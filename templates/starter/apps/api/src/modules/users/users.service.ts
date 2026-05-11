import { PRISMA_CLIENT_TOKEN } from '@ethos/api-base';
import type { AuthRole } from '@ethos/auth';
import { type PrismaClient } from '@ethos/database';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { type UpdateMeDto } from './dto/update-me.dto';

/**
 * UsersService — operações sobre `User` com isolamento por tenant.
 *
 * Princípios (CLAUDE.md / spec #8):
 *  - AC #5 cross-tenant 404: `findInTenant` joina via `TenantMember` no tenant atual;
 *    se não bater, lança `NotFoundException` (404). Nunca 403 — não vazar existência.
 *  - AC #9 tenantId nunca do body: todos os métodos recebem `tenantId` como
 *    argumento explícito (o controller passa `session.tenantId` do JWT).
 *  - Sanitização: `password`, `totpSecret`, `failedLoginAttempts`, `lockedUntil`,
 *    `mfaEnabled` NUNCA vão pra response. Uso de `select` explícito em todos os
 *    queries.
 */

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUserWithRoles extends PublicUser {
  roles: AuthRole[];
}

export interface ListUsersOptions {
  take: number;
  skip: number;
  search?: string;
}

export interface ListUsersResult {
  items: PublicUserWithRoles[];
  total: number;
  take: number;
  skip: number;
}

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient) {}

  /**
   * Lista usuários do tenant atual via `TenantMember`. Paginação simples por
   * take/skip. `search` faz match case-insensitive em email e name.
   */
  async listInTenant(tenantId: string, opts: ListUsersOptions): Promise<ListUsersResult> {
    const { take, skip, search } = opts;

    const searchWhere = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const where = {
      members: { some: { tenantId } },
      ...searchWhere,
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...PUBLIC_USER_SELECT,
          members: {
            where: { tenantId },
            select: { role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.user.count({ where }),
    ]);

    const items: PublicUserWithRoles[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      roles: u.members.map((m) => m.role as AuthRole),
    }));

    return { items, total, take, skip };
  }

  /**
   * Retorna o próprio user (sanitizado) + roles agregados de memberships
   * no tenant atual. Usado pelo GET /users/me.
   *
   * Nota: `locale` no schema é por-Tenant (D15), não por-User. Se vier necessidade
   * de preferência por-user no futuro, vira nova coluna em sprint dedicado.
   */
  async getMe(userId: string, tenantId: string): Promise<PublicUserWithRoles> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...PUBLIC_USER_SELECT,
        members: {
          where: { tenantId },
          select: { role: true },
        },
      },
    });

    if (!user) {
      // Estado inválido — JWT diz user existe mas DB não tem (user deletado mid-session).
      // 404 é seguro: não vaza nada além do que o session já carrega.
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.members.map((m) => m.role as AuthRole),
    };
  }

  /**
   * Atualiza o próprio user. DTO já é `.strict()` no Zod — keys extras (tenantId,
   * email, password, roles) são rejeitadas com 400 antes daqui (AC #9).
   *
   * Retorna o user sanitizado + roles do tenant atual.
   */
  async updateMe(userId: string, tenantId: string, dto: UpdateMeDto): Promise<PublicUserWithRoles> {
    // Construir payload Prisma só com chaves presentes (evita sobrescrever com undefined).
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.image !== undefined) data.image = dto.image;
    // locale fica em Tenant (D15), não em User — silenciosamente ignorado aqui.
    // (Se quisermos persistir preferência por-user, vira coluna em sprint futuro.)

    if (Object.keys(data).length === 0) {
      // Nada pra atualizar — retorna estado atual.
      return this.getMe(userId, tenantId);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        ...PUBLIC_USER_SELECT,
        members: {
          where: { tenantId },
          select: { role: true },
        },
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      image: updated.image,
      emailVerified: updated.emailVerified,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      roles: updated.members.map((m) => m.role as AuthRole),
    };
  }

  /**
   * AC #5 cross-tenant 404 — busca user filtrando por TenantMember no tenant atual.
   * Se user existe globalmente mas NÃO está nesse tenant, retorna 404 (não 403).
   *
   * `findFirst` (não `findUnique`) pra suportar o join no `where` via `members.some`.
   */
  async findInTenant(tenantId: string, userId: string): Promise<PublicUserWithRoles> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        members: { some: { tenantId } },
      },
      select: {
        ...PUBLIC_USER_SELECT,
        members: {
          where: { tenantId },
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.members.map((m) => m.role as AuthRole),
    };
  }
}
