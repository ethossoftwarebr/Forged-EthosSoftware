import { AUTH_ADAPTER_TOKEN, CurrentUser, PRISMA_CLIENT_TOKEN, Public } from '@ethos/api-base';
import type { AuthAdapter, AuthSession } from '@ethos/auth';
import type { PrismaClient } from '@ethos/database';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Headers,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { EnvService } from '../../config/env.module';

import { AuthService, getRetryAfterSeconds } from './auth.service';
import {
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  setAuthCookies,
  type CookieIssueOptions,
} from './cookie.helpers';
import { LoginSchema, type LoginDto } from './dto/login.dto';
import { TenantSlugHeaderSchema } from './dto/refresh.dto';
import { RegisterSchema, type RegisterDto } from './dto/register.dto';
import { signMfaChallengeToken } from './mfa.controller';

/**
 * AuthController — endpoints do AuthModule (D10):
 *  - `@Public()` em register/login/refresh (não exigem cookie pra entrar)
 *  - logout/me passam pelo JwtAuthGuard global
 *
 * Status codes:
 *  - register → 201
 *  - login/refresh/logout/me → 200
 *  - credenciais inválidas / tenant not found / not a member → 401 (D6)
 *  - email já existe → 409
 *  - conta bloqueada → 429 + Retry-After (AC #14)
 *
 * Cookies (D13.7): httpOnly + secure + sameSite=strict; access path=/api,
 * refresh path=/api/auth/refresh; secure=false em dev (NODE_ENV !== production).
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly env: EnvService,
    @Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient,
    @Inject(AUTH_ADAPTER_TOKEN) private readonly adapter: AuthAdapter,
  ) {}

  // ==========================================================================
  // POST /auth/register
  // ==========================================================================

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    user: { id: string; email: string; name: string | null };
    tenant: { id: string; slug: string; name: string };
    roles: string[];
  }> {
    try {
      const { session, tokens } = await this.authService.register({
        email: dto.email,
        password: dto.password,
        name: dto.name,
        tenantSlug: dto.tenantSlug,
        tenantName: dto.tenantName,
      });

      this.issueCookies(res, tokens);

      return {
        user: {
          id: session.userId,
          email: dto.email,
          name: dto.name ?? null,
        },
        tenant: {
          id: session.tenantId,
          slug: dto.tenantSlug,
          name: dto.tenantName ?? dto.tenantSlug,
        },
        roles: session.roles,
      };
    } catch (err) {
      this.attachRetryAfter(res, err);
      throw err;
    }
  }

  // ==========================================================================
  // POST /auth/login
  // ==========================================================================

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<
    | {
        user: { id: string };
        tenant: { id: string; slug: string };
        roles: string[];
      }
    | { requiresMfa: true; mfaToken: string }
  > {
    const uaHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(uaHeader) ? uaHeader[0] : uaHeader;

    try {
      const { session, tokens } = await this.authService.login({
        email: dto.email,
        password: dto.password,
        tenantSlug: dto.tenantSlug,
        userAgent,
        ip: req.ip,
      });

      // D8.7.7 — branching MFA. Check user.mfaEnabled APÓS password verify; se on,
      // revoga refresh recém-emitido + emite mfaToken JWS curto. Cookies NÃO setados.
      // OAuth/Magic Link bypass MFA por design (D8.7.8) — outro fator já provou posse.
      const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
      if (user?.mfaEnabled) {
        // Revoga o refresh token que o adapter emitiu — user só ganha sessão real
        // após challenge MFA passar via /auth/mfa/challenge.
        await this.adapter.logout(tokens.refreshToken).catch(() => {
          // logout é idempotente — falha não bloqueia o flow MFA
        });

        const mfaSecret = this.env.get('MFA_CHALLENGE_JWS_SECRET');
        if (!mfaSecret) {
          // Defense: env schema permite ausência (optional); aqui falha-fast
          // pq mfaEnabled=true sem MFA_CHALLENGE_JWS_SECRET é misconfig grave.
          throw new HttpException(
            { code: 'INTERNAL_ERROR', message: 'MFA configurado mas servidor indisponível.' },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }

        const mfaToken = await signMfaChallengeToken({
          userId: session.userId,
          tenantId: session.tenantId,
          secret: mfaSecret,
        });

        return { requiresMfa: true, mfaToken };
      }

      this.issueCookies(res, tokens);

      return {
        user: { id: session.userId },
        tenant: { id: session.tenantId, slug: dto.tenantSlug },
        roles: session.roles,
      };
    } catch (err) {
      this.attachRetryAfter(res, err);
      throw err;
    }
  }

  // ==========================================================================
  // POST /auth/refresh
  // ==========================================================================

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-tenant-slug') tenantSlugHeader: string | undefined,
  ): Promise<{ ok: true }> {
    const cookies = (req as Request & { cookies?: Record<string, string | undefined> }).cookies;
    const refreshToken = cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Refresh token ausente.',
      });
    }

    const tenantSlugParsed = TenantSlugHeaderSchema.safeParse(tenantSlugHeader);
    if (!tenantSlugParsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Header X-Tenant-Slug ausente ou inválido.',
        details: tenantSlugParsed.error.flatten(),
      });
    }

    const tokens = await this.authService.refresh(refreshToken, tenantSlugParsed.data);
    this.issueCookies(res, tokens);

    return { ok: true };
  }

  // ==========================================================================
  // POST /auth/logout (privado — passa pelo JwtAuthGuard global)
  // ==========================================================================

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const cookies = (req as Request & { cookies?: Record<string, string | undefined> }).cookies;
    const refreshToken = cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    clearAuthCookies(res, this.cookieOptions());
    return { ok: true };
  }

  // ==========================================================================
  // GET /auth/me (privado — passa pelo JwtAuthGuard global)
  // ==========================================================================

  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@CurrentUser() session: AuthSession): {
    userId: string;
    tenantId: string;
    roles: string[];
  } {
    return {
      userId: session.userId,
      tenantId: session.tenantId,
      roles: session.roles,
    };
  }

  // ==========================================================================
  // Helpers internos
  // ==========================================================================

  private cookieOptions(): CookieIssueOptions {
    const domain = this.env.get('COOKIE_DOMAIN');
    return {
      isProduction: this.env.get('NODE_ENV') === 'production',
      ...(domain ? { domain } : {}),
    };
  }

  private issueCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
    setAuthCookies(res, tokens, this.cookieOptions());
  }

  private attachRetryAfter(res: Response, err: unknown): void {
    if (err instanceof HttpException) {
      const seconds = getRetryAfterSeconds(err);
      if (seconds !== undefined) {
        res.setHeader('Retry-After', String(seconds));
      }
    }
  }
}
