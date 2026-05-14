import {
  AUTH_ADAPTER_TOKEN,
  Audit,
  CurrentUser,
  Public,
  PRISMA_CLIENT_TOKEN,
} from '@ethos/api-base';
import {
  MfaErrorCode,
  type AuthAdapter,
  type AuthSession,
  type MfaSetupPayload,
  verifyPassword,
} from '@ethos/auth';
import type { PrismaClient } from '@ethos/database';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { jwtVerify, SignJWT } from 'jose';

import { EnvService } from '../../config/env.module';

import { setAuthCookies, type CookieIssueOptions } from './cookie.helpers';

// Logger evita PII (D13.6) e erros opacos chegam ao client (anti-enum mantém shape).

/**
 * MfaController (D8.7) — implementa fluxo TOTP + backup codes:
 *
 * Endpoints:
 *   POST /auth/mfa/setup            (auth) → gera secret + QR (idempotente via upsert)
 *   POST /auth/mfa/setup/confirm    (auth) → verifica primeiro TOTP + retorna 10 backup codes
 *   POST /auth/mfa/challenge        (anon) → completa login após password OK + TOTP
 *   POST /auth/mfa/challenge/backup (anon) → completa via backup code single-use
 *   POST /auth/mfa/disable          (auth) → re-auth via password + apaga MfaSecret + codes
 *   GET  /auth/mfa/status           (auth) → enabled? verifiedAt? backupCodesRemaining
 *
 * Regras críticas (D8.7):
 *  - `tenantId` SEMPRE vem do JWT (challenge: mfaToken JWS; outros: AuthSession).
 *    NUNCA do body/query/header — multi-tenant rule do CLAUDE.md.
 *  - mfaToken expira em 5min (D8.7.7); assinado HS256 com `MFA_CHALLENGE_JWS_SECRET`.
 *  - Rate limit no challenge: 5 tentativas / 15min por userId+tenantId. In-memory
 *    sliding window por enquanto (concern: Redis-backed pós-v1 — single instance only).
 *  - Login flow MOD em AuthController: branch `mfaEnabled && password OK` —
 *    revoga refresh recém-emitido + retorna `{ requiresMfa, mfaToken }` sem cookies.
 *  - Magic Link e OAuth BYPASSAM MFA por design (D8.7.8) — outro fator já provou
 *    posse (inbox / IdP). Documentado nos respectivos controllers.
 *
 * Audit events emitidos (via @Audit decorator quando há ALS context, ou Logger fallback):
 *  - auth.mfa.setup, auth.mfa.enabled, auth.mfa.challenge.success,
 *    auth.mfa.challenge.failed, auth.mfa.backup_used, auth.mfa.disabled.
 */
@ApiTags('auth')
@Controller('auth/mfa')
export class MfaController {
  private readonly logger = new Logger(MfaController.name);

  /**
   * Rate limit in-memory (sliding window por userId+tenantId).
   * CONCERN: stateless deploys (Railway, K8s) precisam de Redis-backed counter.
   * Implementação V1 OK pra single-instance — pós-v1 trocar por @ethos/queue Redis client.
   */
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly env: EnvService,
    @Inject(AUTH_ADAPTER_TOKEN) private readonly adapter: AuthAdapter,
    @Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient,
  ) {}

  // ==========================================================================
  // POST /auth/mfa/setup — gera secret TOTP + QR
  // ==========================================================================

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @Audit('auth.mfa.setup')
  @ApiOkResponse({
    description:
      'Gera secret TOTP + QR code (idempotente — upsert). User precisa confirmar via /setup/confirm.',
  })
  async setup(@CurrentUser() session: AuthSession): Promise<MfaSetupPayload> {
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      // Defensive — JWT válido sem user em DB é cenário "user deletado mid-session".
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Sessão inválida.' });
    }

    try {
      return await this.adapter.setupMfa({
        userId: session.userId,
        tenantId: session.tenantId,
        issuer: this.env.get('MFA_APP_NAME'),
        accountName: user.email,
      });
    } catch (err) {
      throw this.translateMfaError(err);
    }
  }

  // ==========================================================================
  // POST /auth/mfa/setup/confirm — confirma + retorna backup codes
  // ==========================================================================

  @Post('setup/confirm')
  @HttpCode(HttpStatus.OK)
  @Audit('auth.mfa.enabled')
  async confirmSetup(
    @CurrentUser() session: AuthSession,
    @Body() body: { code?: string },
  ): Promise<{ backupCodes: string[] }> {
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!code || !/^\d{6}$/.test(code)) {
      throw new UnauthorizedException({
        code: MfaErrorCode.MFA_INVALID,
        message: 'Código TOTP inválido.',
      });
    }

    try {
      const result = await this.adapter.confirmMfaSetup({
        userId: session.userId,
        tenantId: session.tenantId,
        code,
      });

      // Flag mfaEnabled=true pra que o próximo login dispare o flow MFA.
      await this.prisma.user.update({
        where: { id: session.userId },
        data: { mfaEnabled: true },
      });

      return result;
    } catch (err) {
      throw this.translateMfaError(err);
    }
  }

  // ==========================================================================
  // POST /auth/mfa/challenge — completa login com TOTP
  // ==========================================================================

  @Public()
  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  async challenge(
    @Body() body: { mfaToken?: string; code?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const { userId, tenantId } = await this.verifyMfaToken(body?.mfaToken);
    const code = this.requireSixDigits(body?.code);

    this.enforceRateLimit(`totp:${userId}:${tenantId}`);

    const result = await this.adapter.verifyMfaChallenge({ userId, tenantId, code });
    if (!result.ok) {
      this.logger.warn(
        `[mfa] challenge falhou user=${userId} tenant=${tenantId} reason=${result.reason ?? 'invalid'}`,
      );
      throw new UnauthorizedException({
        code: MfaErrorCode.MFA_INVALID,
        message: 'Código TOTP inválido.',
      });
    }

    await this.issueSessionAfterMfa(userId, tenantId, req, res, 'auth.mfa.challenge.success');
    return { ok: true };
  }

  // ==========================================================================
  // POST /auth/mfa/challenge/backup — completa via backup code single-use
  // ==========================================================================

  @Public()
  @Post('challenge/backup')
  @HttpCode(HttpStatus.OK)
  async challengeBackup(
    @Body() body: { mfaToken?: string; code?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const { userId, tenantId } = await this.verifyMfaToken(body?.mfaToken);
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (code.length === 0) {
      throw new UnauthorizedException({
        code: MfaErrorCode.MFA_INVALID,
        message: 'Backup code inválido.',
      });
    }

    this.enforceRateLimit(`backup:${userId}:${tenantId}`);

    const result = await this.adapter.consumeBackupCode({ userId, tenantId, code });
    if (!result.ok) {
      const errorCode =
        result.reason === 'backup_used' ? MfaErrorCode.MFA_BACKUP_USED : MfaErrorCode.MFA_INVALID;
      this.logger.warn(
        `[mfa] backup challenge falhou user=${userId} tenant=${tenantId} reason=${result.reason ?? 'invalid'}`,
      );
      throw new UnauthorizedException({
        code: errorCode,
        message:
          result.reason === 'backup_used' ? 'Backup code já utilizado.' : 'Backup code inválido.',
      });
    }

    await this.issueSessionAfterMfa(userId, tenantId, req, res, 'auth.mfa.backup_used');
    return { ok: true };
  }

  // ==========================================================================
  // POST /auth/mfa/disable — re-auth + apaga
  // ==========================================================================

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @Audit('auth.mfa.disabled')
  async disable(
    @CurrentUser() session: AuthSession,
    @Body() body: { password?: string },
  ): Promise<{ ok: true }> {
    const password = typeof body?.password === 'string' ? body.password : '';
    if (password.length === 0) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Senha obrigatória pra desabilitar MFA.',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.password) {
      // user OAuth-only / magic-link-only não tem password — não dá pra re-autenticar.
      // Em V1 bloqueamos disable; pós-v1 aceitar 2º fator alternativo (TOTP ativo OU recovery).
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Re-autenticação não disponível pra contas sem senha.',
      });
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Senha inválida.',
      });
    }

    await this.adapter.disableMfa({ userId: session.userId, tenantId: session.tenantId });

    // Limpa flag mfaEnabled pra que o próximo login seja direto (sem challenge).
    await this.prisma.user.update({
      where: { id: session.userId },
      data: { mfaEnabled: false },
    });

    // Reseta contadores de rate limit pra esse user em ambos os modos.
    this.attempts.delete(`totp:${session.userId}:${session.tenantId}`);
    this.attempts.delete(`backup:${session.userId}:${session.tenantId}`);

    return { ok: true };
  }

  // ==========================================================================
  // GET /auth/mfa/status — info pública pro próprio user
  // ==========================================================================

  @Get('status')
  @HttpCode(HttpStatus.OK)
  async status(
    @CurrentUser() session: AuthSession,
  ): Promise<{ enabled: boolean; verifiedAt: Date | null; backupCodesRemaining: number }> {
    const secret = await this.prisma.mfaSecret.findUnique({
      where: { userId_tenantId: { userId: session.userId, tenantId: session.tenantId } },
    });
    const enabled = Boolean(secret?.verifiedAt);
    const remaining = enabled
      ? await this.prisma.mfaBackupCode.count({
          where: { userId: session.userId, usedAt: null },
        })
      : 0;
    return {
      enabled,
      verifiedAt: secret?.verifiedAt ?? null,
      backupCodesRemaining: remaining,
    };
  }

  // ==========================================================================
  // Helpers internos
  // ==========================================================================

  /**
   * Decodifica + valida mfaToken (JWS HS256, scope=mfa-challenge, exp ≤5min).
   * Retorna { userId, tenantId } extraídos do payload.
   */
  private async verifyMfaToken(token: unknown): Promise<{ userId: string; tenantId: string }> {
    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'mfaToken ausente.',
      });
    }
    const secret = this.env.get('MFA_CHALLENGE_JWS_SECRET');
    if (!secret) {
      this.logger.error('MFA_CHALLENGE_JWS_SECRET ausente — flow MFA indisponível.');
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'MFA indisponível.',
      });
    }

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ['HS256'],
        issuer: 'ethos-forge',
        audience: 'mfa-challenge',
      });
      const scope = typeof payload.scope === 'string' ? payload.scope : '';
      const userId = typeof payload.sub === 'string' ? payload.sub : '';
      const tenantId = typeof payload.tid === 'string' ? payload.tid : '';
      if (scope !== 'mfa-challenge' || !userId || !tenantId) {
        throw new Error('Payload mfaToken malformado.');
      }
      return { userId, tenantId };
    } catch (err) {
      this.logger.warn(`mfaToken inválido: ${(err as Error).message}`);
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'mfaToken inválido ou expirado.',
      });
    }
  }

  /**
   * Emite cookies de sessão após challenge MFA OK. Usa `loginWithMagicLink` do
   * adapter (mesmo padrão: re-issue tokens sem password). Email é resolvido
   * via Prisma pelo userId; tenantSlug via tenantId.
   *
   * Nota: `loginWithMagicLink` seta `emailVerified=now()` se for null —
   * idempotente quando já verificado (caso comum aqui — user já logou com
   * password antes do challenge).
   */
  private async issueSessionAfterMfa(
    userId: string,
    tenantId: string,
    req: Request,
    res: Response,
    auditAction: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!user || !tenant) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Sessão MFA inválida.',
      });
    }

    const uaHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(uaHeader) ? uaHeader[0] : uaHeader;

    const result = await this.adapter.loginWithMagicLink({
      email: user.email,
      tenantSlug: tenant.slug,
      ...(userAgent ? { userAgent } : {}),
      ...(req.ip ? { ip: req.ip } : {}),
    });

    setAuthCookies(res, result.tokens, this.cookieOptions());
    this.logger.log(`[audit] ${auditAction} user=${userId} tenant=${tenantId}`);
  }

  /**
   * Sliding window in-memory por chave. Throws 429 se exceder.
   * CONCERN: substituir por Redis-backed counter pós-v1 (multi-instance).
   */
  private enforceRateLimit(key: string): void {
    const max = this.env.get('MFA_RATE_LIMIT_MAX');
    const windowMs = this.env.get('MFA_RATE_LIMIT_WINDOW_MS');
    const now = Date.now();
    const cutoff = now - windowMs;

    const existing = this.attempts.get(key) ?? [];
    // Mantém só timestamps dentro da window.
    const recent = existing.filter((t) => t > cutoff);
    if (recent.length >= max) {
      const oldest = recent[0] ?? now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      // Nest 10 não tem TooManyRequestsException — usar HttpException direto.
      throw new HttpException(
        {
          code: 'MFA_RATE_LIMITED',
          message: `Muitas tentativas. Tente novamente em ${retryAfterSeconds}s.`,
          retryAfter: retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.attempts.set(key, recent);
  }

  private requireSixDigits(value: unknown): string {
    const code = typeof value === 'string' ? value.trim() : '';
    if (!/^\d{6}$/.test(code)) {
      throw new UnauthorizedException({
        code: MfaErrorCode.MFA_INVALID,
        message: 'Código TOTP inválido.',
      });
    }
    return code;
  }

  private cookieOptions(): CookieIssueOptions {
    const domain = this.env.get('COOKIE_DOMAIN');
    return {
      isProduction: this.env.get('NODE_ENV') === 'production',
      ...(domain ? { domain } : {}),
    };
  }

  /**
   * Mapeia `Error & { code }` da lib MFA pra HttpException.
   * Erros não-mapeados viram 500 — fail loud pra catch em dev.
   */
  private translateMfaError(err: unknown): Error {
    if (!(err instanceof Error)) {
      return new BadRequestException({ code: 'INTERNAL_ERROR', message: 'Erro MFA.' });
    }
    const code = (err as Error & { code?: string }).code;
    switch (code) {
      case MfaErrorCode.MFA_INVALID:
        return new UnauthorizedException({ code, message: err.message });
      case MfaErrorCode.MFA_ALREADY_ENABLED:
      case MfaErrorCode.MFA_SETUP_NOT_CONFIRMED:
      case MfaErrorCode.MFA_NOT_ENABLED:
        return new BadRequestException({ code, message: err.message });
      default:
        return err;
    }
  }
}

// ============================================================================
// Helpers exportados pra reuso no AuthController (login MOD)
// ============================================================================

/**
 * Emite mfaToken JWS HS256 com scope=mfa-challenge, exp=5min.
 * Caller (AuthController) chama isso após password OK quando user tem mfaEnabled=true.
 */
export async function signMfaChallengeToken(params: {
  userId: string;
  tenantId: string;
  secret: string;
}): Promise<string> {
  const { userId, tenantId, secret } = params;
  const issuedAt = Math.floor(Date.now() / 1000);
  return new SignJWT({ scope: 'mfa-challenge', tid: tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('ethos-forge')
    .setAudience('mfa-challenge')
    .setSubject(userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 5 * 60)
    .sign(new TextEncoder().encode(secret));
}
