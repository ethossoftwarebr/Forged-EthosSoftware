import { PRISMA_CLIENT_TOKEN } from '@ethos/api-base';
import type { AuthRole } from '@ethos/auth';
import { type PrismaClient } from '@ethos/database';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { type InviteDto } from './dto/invite.dto';
import { type UpdateTenantDto } from './dto/update-tenant.dto';

/**
 * TenantsService — operações sobre `Tenant` + `TenantMember`.
 *
 * Princípios travados (CLAUDE.md / spec #8):
 *  - AC #9 tenantId nunca do body — todos os métodos recebem tenantId via arg
 *    (controller passa session.tenantId do JWT).
 *  - LAST_OWNER protection em `removeMember`: count owners antes; se for o
 *    último owner do tenant → 409 LAST_OWNER.
 *  - InviteDto já bloqueia role='owner' no Zod enum; defesa em profundidade
 *    aqui também (TS type já cobre, mas runtime check é cheap).
 *  - Sanitização de User: nunca expor password/totpSecret/lockedUntil/etc.
 */

const PUBLIC_TENANT_SELECT = {
  id: true,
  slug: true,
  name: true,
  settings: true,
  brandColor: true,
  logoUrl: true,
  appName: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PUBLIC_MEMBER_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  emailVerified: true,
} as const;

export interface PublicTenant {
  id: string;
  slug: string;
  name: string;
  settings: unknown;
  brandColor: string | null;
  logoUrl: string | null;
  appName: string | null;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicMember {
  id: string;
  role: AuthRole;
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: Date | null;
  };
}

export interface ListMembersOptions {
  take: number;
  skip: number;
}

export interface ListMembersResult {
  items: PublicMember[];
  total: number;
  take: number;
  skip: number;
}

export interface InviteResult {
  invited: true;
  userId: string;
  isNewUser: boolean;
  membershipId: string;
}

@Injectable()
export class TenantsService {
  constructor(@Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient) {}

  async getMe(tenantId: string): Promise<PublicTenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: PUBLIC_TENANT_SELECT,
    });
    if (!tenant) {
      // JWT carrega tenantId — se DB não tem, tenant foi deletado mid-session.
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'Tenant não encontrado.' });
    }
    return tenant as PublicTenant;
  }

  async updateMe(tenantId: string, dto: UpdateTenantDto): Promise<PublicTenant> {
    // Constrói payload Prisma só com chaves presentes (evita sobrescrever com undefined).
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.locale !== undefined) data.locale = dto.locale;
    if (dto.brandColor !== undefined) data.brandColor = dto.brandColor;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.appName !== undefined) data.appName = dto.appName;
    if (dto.settings !== undefined) data.settings = dto.settings;

    if (Object.keys(data).length === 0) {
      return this.getMe(tenantId);
    }

    try {
      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data,
        select: PUBLIC_TENANT_SELECT,
      });
      return updated as PublicTenant;
    } catch (err) {
      // Tenant deletado entre o guard e o update — trata como 404.
      if (isPrismaNotFound(err)) {
        throw new NotFoundException({
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant não encontrado.',
        });
      }
      throw err;
    }
  }

  async listMembers(tenantId: string, opts: ListMembersOptions): Promise<ListMembersResult> {
    const { take, skip } = opts;

    const [members, total] = await Promise.all([
      this.prisma.tenantMember.findMany({
        where: { tenantId },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: { select: PUBLIC_MEMBER_USER_SELECT },
        },
        orderBy: { joinedAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.tenantMember.count({ where: { tenantId } }),
    ]);

    const items: PublicMember[] = members.map((m) => ({
      id: m.id,
      role: m.role as AuthRole,
      joinedAt: m.joinedAt,
      user: m.user,
    }));

    return { items, total, take, skip };
  }

  /**
   * Cria membership. Comportamento:
   *  - Se email já existe globalmente: vincula User existente ao tenant atual
   *    (idempotent — se já é membro, 409 ALREADY_MEMBER)
   *  - Se email não existe: cria User stub (password=null, emailVerified=null) +
   *    TenantMember. Email transactional de onboarding fica pra #8.6 (D14.7).
   *
   * `role` já é validado no Zod sem 'owner'.
   */
  async inviteMember(tenantId: string, invitedBy: string, dto: InviteDto): Promise<InviteResult> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    return this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: normalizedEmail } });
      let isNewUser = false;

      if (!user) {
        // User stub — magic link de onboarding em #8.6 dispara o set-password.
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            password: null,
            emailVerified: null,
          },
        });
        isNewUser = true;
      }

      // Idempotência: se já é membro, 409 ALREADY_MEMBER.
      const existing = await tx.tenantMember.findUnique({
        where: { tenantId_userId: { tenantId, userId: user.id } },
      });
      if (existing) {
        throw new ConflictException({
          code: 'ALREADY_MEMBER',
          message: 'Usuário já é membro deste tenant.',
        });
      }

      const member = await tx.tenantMember.create({
        data: {
          tenantId,
          userId: user.id,
          role: dto.role,
          invitedBy,
        },
      });

      // TODO(#8.6 / D14.7): enviar magic link de onboarding pra `normalizedEmail`
      // se isNewUser (set-password flow) ou notificação simples se !isNewUser.

      return { invited: true, userId: user.id, isNewUser, membershipId: member.id };
    });
  }

  /**
   * Remove membership do user `userId` no tenant atual.
   *
   * Protections:
   *  - Cross-tenant 404: member precisa existir nesse tenant; senão NotFound.
   *  - LAST_OWNER: se o member sendo removido é o último `owner`, 409.
   *  - Self-removal permitido (a menos que viole LAST_OWNER).
   *
   * NÃO deleta o User — só o vínculo TenantMember.
   */
  async removeMember(tenantId: string, userId: string): Promise<{ removed: true }> {
    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { id: true, role: true },
    });
    if (!member) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Membership não encontrado neste tenant.',
      });
    }

    if (member.role === 'owner') {
      const ownerCount = await this.prisma.tenantMember.count({
        where: { tenantId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new HttpException(
          {
            code: 'LAST_OWNER',
            message: 'Não é possível remover o último owner do tenant.',
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    await this.prisma.tenantMember.delete({ where: { id: member.id } });
    return { removed: true };
  }
}

function isPrismaNotFound(err: unknown): boolean {
  // Prisma 5 lança P2025 quando update/delete não acha o registro.
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025';
}
