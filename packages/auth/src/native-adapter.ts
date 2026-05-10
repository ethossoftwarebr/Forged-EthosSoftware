import type { Prisma, PrismaClient, Role } from '@ethos/database';

import type { AuthAdapter } from './adapter';
import { hashPassword, hashToken, verifyPassword, verifyTokenHash } from './hash';
import type { JwtKeyset } from './jwks';
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from './jwt';
import type { AuthRole, AuthSession, IssuedTokens, LoginCredentials, RegisterInput } from './types';

/**
 * NativeAuthAdapter (D14.2) — implementação default do `AuthAdapter`.
 *
 * Stack: argon2id (D1) + jose JWT EdDSA (D2 + D13) + Prisma multi-tenant.
 * Implementa lockout exponencial (D14.6) + refresh rotation com detecção de
 * reuse (D5).
 *
 * Refresh token format (opt A travada no #8): `${refreshTokenId}.${secret}`
 *   - lookup por ID indexed (O(1))
 *   - argon2id verify do `secret` contra `tokenHash` (O(~100ms))
 *   - secret 256-bit base64url
 *
 * Reuse detection (D5): se um refresh token JÁ ROTACIONADO for reapresentado
 * (`revokedAt != null` mas `tokenHash` ainda casa), revoga a `family` inteira
 * (todos os tokens irmãos) — defesa contra replay.
 */
export class NativeAuthAdapter implements AuthAdapter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly keyset: JwtKeyset,
  ) {}

  // ==========================================================================
  // Register
  // ==========================================================================

  async register(input: RegisterInput): Promise<{ session: AuthSession; tokens: IssuedTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw authError('EMAIL_TAKEN', 'Email já cadastrado.');
    }

    const passwordHash = await hashPassword(input.password);

    const result = await this.prisma.$transaction(async (tx) => {
      // Tenant: lookup ou cria (se cria, user vira owner)
      let tenant = await tx.tenant.findUnique({ where: { slug: input.tenantSlug } });
      let isNewTenant = false;
      if (!tenant) {
        tenant = await tx.tenant.create({
          data: {
            slug: input.tenantSlug,
            name: input.tenantName ?? input.tenantSlug,
          },
        });
        isNewTenant = true;
      }

      const user = await tx.user.create({
        data: {
          email: input.email,
          password: passwordHash,
          name: input.name,
        },
      });

      const role: Role = isNewTenant ? 'owner' : 'member';
      await tx.tenantMember.create({
        data: { tenantId: tenant.id, userId: user.id, role },
      });

      return { user, tenant, role };
    });

    const tokens = await this.issueTokens(result.user.id, result.tenant.id, [
      result.role as AuthRole,
    ]);
    const session = await this.verifyAccessToken(tokens.accessToken);
    return { session, tokens };
  }

  // ==========================================================================
  // Login (com lockout D14.6)
  // ==========================================================================

  async login(creds: LoginCredentials): Promise<{ session: AuthSession; tokens: IssuedTokens }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: creds.tenantSlug } });
    if (!tenant) {
      throw authError('TENANT_NOT_FOUND', 'Tenant inexistente.');
    }

    const user = await this.prisma.user.findUnique({ where: { email: creds.email } });
    if (!user) {
      throw authError('INVALID_CREDENTIALS', 'Credenciais inválidas.');
    }

    // Lockout check (D14.6)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw authError('ACCOUNT_LOCKED', `Conta bloqueada até ${user.lockedUntil.toISOString()}.`);
    }

    // Se locked expirou, reseta counter antes de tentar
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    if (!user.password) {
      // user é OAuth-only ou magic-link-only
      throw authError('INVALID_CREDENTIALS', 'Use o método de login configurado.');
    }

    const passwordOk = await verifyPassword(creds.password, user.password);

    if (!passwordOk) {
      const newCount = user.failedLoginAttempts + 1;
      const lockUntil = computeLockUntil(newCount);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newCount, lockedUntil: lockUntil },
      });
      if (lockUntil) {
        throw authError('ACCOUNT_LOCKED', `Conta bloqueada até ${lockUntil.toISOString()}.`);
      }
      throw authError('INVALID_CREDENTIALS', 'Credenciais inválidas.');
    }

    // Sucesso: reseta counter + verifica membership
    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    });
    if (!member) {
      throw authError('NOT_A_MEMBER', 'Usuário não é membro deste tenant.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const tokens = await this.issueTokens(user.id, tenant.id, [member.role as AuthRole], {
      userAgent: creds.userAgent,
      ip: creds.ip,
    });
    const session = await this.verifyAccessToken(tokens.accessToken);
    return { session, tokens };
  }

  // ==========================================================================
  // Refresh — rotação D5 + detecção de reuse
  // ==========================================================================

  async refresh(refreshToken: string, tenantSlug: string): Promise<IssuedTokens> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      throw authError('TENANT_NOT_FOUND', 'Tenant inexistente.');
    }

    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) {
      throw authError('TOKEN_INVALID', 'Refresh token malformado.');
    }
    const { rtId, secret } = parsed;

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: rtId } });
    if (!stored) {
      throw authError('TOKEN_INVALID', 'Refresh token não encontrado.');
    }

    if (stored.tenantId !== tenant.id) {
      throw authError('TOKEN_INVALID', 'Refresh token de outro tenant.');
    }

    if (stored.expiresAt <= new Date()) {
      throw authError('TOKEN_EXPIRED', 'Refresh token expirado.');
    }

    const hashOk = await verifyTokenHash(secret, stored.tokenHash);
    if (!hashOk) {
      throw authError('TOKEN_INVALID', 'Refresh token inválido.');
    }

    // Reuse detection — token já rotacionado/revogado
    if (stored.revokedAt) {
      // Revoga a family inteira — replay attack
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw authError('TOKEN_REUSED', 'Refresh token reutilizado — sessão revogada.');
    }

    // Busca role atual do membership (pode ter mudado desde o login)
    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId: stored.tenantId, userId: stored.userId } },
    });
    if (!member) {
      throw authError('NOT_A_MEMBER', 'Usuário não é mais membro deste tenant.');
    }

    // Rotaciona — revoga old, cria novo na mesma family
    const tokens = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), rotatedAt: new Date() },
      });
      return this.issueTokens(stored.userId, stored.tenantId, [member.role as AuthRole], {
        family: stored.family,
        prismaTx: tx,
      });
    });

    return tokens;
  }

  // ==========================================================================
  // Logout
  // ==========================================================================

  async logout(refreshToken: string): Promise<void> {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) return; // logout silencioso pra token malformado

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: parsed.rtId } });
    if (!stored || stored.revokedAt) return;

    const hashOk = await verifyTokenHash(parsed.secret, stored.tokenHash);
    if (!hashOk) return;

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
  }

  // ==========================================================================
  // verifyAccessToken
  // ==========================================================================

  async verifyAccessToken(token: string): Promise<AuthSession> {
    return verifyAccessToken(this.keyset, token);
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private async issueTokens(
    userId: string,
    tenantId: string,
    roles: AuthRole[],
    options: {
      family?: string;
      userAgent?: string;
      ip?: string;
      prismaTx?: PrismaClient | Prisma.TransactionClient;
    } = {},
  ): Promise<IssuedTokens> {
    const accessToken = await signAccessToken(this.keyset, {
      sub: userId,
      tid: tenantId,
      roles,
    });

    const secret = generateRefreshToken();
    const tokenHash = await hashToken(secret);
    const family = options.family ?? cryptoRandomId();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const db = options.prismaTx ?? this.prisma;
    const stored = await db.refreshToken.create({
      data: {
        tokenHash,
        userId,
        tenantId,
        family,
        expiresAt,
        userAgent: options.userAgent,
        ip: options.ip,
      },
    });

    const refreshTokenPlaintext = `${stored.id}.${secret}`;

    return {
      accessToken: accessToken.token,
      refreshToken: refreshTokenPlaintext,
      accessTokenExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
      refreshTokenExpiresAt: expiresAt,
    };
  }
}

// ============================================================================
// Helpers fora da classe
// ============================================================================

function parseRefreshToken(token: string): { rtId: string; secret: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [rtId, secret] = parts;
  if (!rtId || !secret) return null;
  return { rtId, secret };
}

/**
 * Lockout exponencial (D14.6):
 *   5 falhas → 15min
 *  10 falhas → 1h
 *  20 falhas → 24h
 *  Não bloqueia abaixo de 5.
 */
function computeLockUntil(failedAttempts: number): Date | null {
  const now = Date.now();
  if (failedAttempts >= 20) return new Date(now + 24 * 60 * 60 * 1000);
  if (failedAttempts >= 10) return new Date(now + 60 * 60 * 1000);
  if (failedAttempts >= 5) return new Date(now + 15 * 60 * 1000);
  return null;
}

function cryptoRandomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

function authError(
  code:
    | 'INVALID_CREDENTIALS'
    | 'ACCOUNT_LOCKED'
    | 'EMAIL_TAKEN'
    | 'TENANT_NOT_FOUND'
    | 'NOT_A_MEMBER'
    | 'TOKEN_EXPIRED'
    | 'TOKEN_INVALID'
    | 'TOKEN_REUSED'
    | 'MFA_REQUIRED',
  message: string,
): Error {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}
