import { Audit, Public } from '@ethos/api-base';
import {
  MagicLinkErrorCode,
  buildMagicErrorRedirect,
  type EmailMagicLinkProvider,
} from '@ethos/auth';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { EnvService } from '../../config/env.module';

import { setAuthCookies, type CookieIssueOptions } from './cookie.helpers';
import { MAGIC_LINK_PROVIDER_TOKEN, type MagicLinkProviderOrNull } from './magic-link.tokens';
import { extractTenantSlug } from './oauth.controller';

/**
 * MagicLinkController (D8.6) — implementa fluxo passwordless via email.
 *
 * Endpoints:
 *   POST /auth/magic-link/request   → 200 sempre (anti-enumeração + delay constante 300ms)
 *   GET  /auth/magic-link/verify    → 302 /dashboard (sucesso) ou /login?error=magic_*
 *
 * Regras críticas:
 *  - `tenantSlug` SEMPRE vem do Host header (D8.6.4) — nunca do query/body.
 *  - POST sempre retorna 200 mesmo se email inexistente / provider null / falha
 *    de envio (D8.6.5 anti-enumeração + delay 300ms constante).
 *  - GET valida tenant resolvido vs `MagicLinkToken.tenantId` (D8.6.7).
 *  - Provider null (RESEND_API_KEY ausente) é graceful: POST 200 silencioso,
 *    GET redirect `?error=magic_email_provider_unavailable`.
 *
 * Rate limit (D8.6.3): 5 req/hora por IP no POST. Tracking por IP em V1
 * (email-based tracker fica como follow-up se abuse detectado).
 */
@ApiTags('auth')
@Controller('auth/magic-link')
export class MagicLinkController {
  private readonly logger = new Logger(MagicLinkController.name);

  constructor(
    private readonly env: EnvService,
    @Inject(MAGIC_LINK_PROVIDER_TOKEN)
    private readonly provider: MagicLinkProviderOrNull,
  ) {}

  // ==========================================================================
  // POST /auth/magic-link/request — emite magic link
  // ==========================================================================

  @Public()
  @Post('request')
  @HttpCode(HttpStatus.OK)
  /**
   * Rate limit hardcoded: 5 req/hora por IP (D8.6.3).
   * Não é configurável via env em V1 — @Throttle é declaração estática do NestJS
   * e não aceita valores runtime de forma trivial sem uma custom guard que injete
   * EnvService. Defer pós-v1: implementar DynamicThrottlerGuard se abuse detectado.
   * Ver: https://github.com/ethos-software/ethos-forge/issues/TODO-rate-limit-dynamic
   */
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @Audit('auth.magic_link.request')
  @ApiOkResponse({
    description:
      'Sempre 200 (anti-enumeração D8.6.5). Mesmo body com email inválido, inexistente, provider down ou rate-limited.',
  })
  async request(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- anti-enum D8.6.5: nunca rejeitar com 400 por formato de email
    @Body() rawBody: any,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    const start = Date.now();

    // Validação leniente inline — anti-enum: email malformado silenciado (200) em vez de 400.
    // Isso garante que um attacker não distingue "email rejeitado por formato" de "aceito".
    const email =
      typeof rawBody?.email === 'string' && rawBody.email.trim().length > 0
        ? rawBody.email.trim()
        : null;
    const isValidEmail =
      email !== null && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const provider = this.provider;

    // Se email inválido, provider null ou sem tenant → delay constante + 200 silencioso (anti-enum).
    if (!isValidEmail || !provider) {
      await this.constantTimeDelay(start);
      return { ok: true };
    }

    const tenantSlug = extractTenantSlug(req);
    // Sem tenant resolvido (marketplace direto), não há como persistir
    // MagicLinkToken.tenantId — silenciar com 200 + delay (anti-enum).
    if (!tenantSlug) {
      await this.constantTimeDelay(start);
      return { ok: true };
    }

    try {
      await this.sendMagicLinkSafe(provider, {
        email,
        tenantSlug,
        appUrl: this.webBaseUrl(),
      });
    } catch (err) {
      // Anti-enum: NUNCA propaga erro — só loga server-side.
      this.logger.warn(`Magic link request falhou silenciosamente: ${(err as Error).message}`);
    }

    await this.constantTimeDelay(start);
    return { ok: true };
  }

  // ==========================================================================
  // GET /auth/magic-link/verify — consome token + emite cookies
  // ==========================================================================

  @Public()
  @Get('verify')
  @Audit('auth.magic_link.verify')
  async verify(
    @Query('token') token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const provider = this.provider;
    const loginUrl = `${this.webBaseUrl()}/login`;

    // Graceful degradation: provider null → erro opaco.
    if (!provider) {
      res.redirect(
        buildMagicErrorRedirect(loginUrl, MagicLinkErrorCode.EMAIL_PROVIDER_UNAVAILABLE),
      );
      return;
    }

    // Token ausente/vazio → invalid.
    if (!token || typeof token !== 'string' || token.length === 0) {
      res.redirect(buildMagicErrorRedirect(loginUrl, MagicLinkErrorCode.TOKEN_INVALID));
      return;
    }

    const resolvedTenantSlug = extractTenantSlug(req);
    const uaHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(uaHeader) ? uaHeader[0] : uaHeader;

    try {
      const result = await provider.verifyToken(token, {
        ...(resolvedTenantSlug ? { resolvedTenantSlug } : {}),
        ...(userAgent ? { userAgent } : {}),
        ...(req.ip ? { ip: req.ip } : {}),
      });

      setAuthCookies(res, result.tokens, this.cookieOptions());
      res.redirect(`${this.webBaseUrl()}/dashboard`);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      this.logger.warn(`Magic link verify falhou (code=${code}): ${(err as Error).message}`);

      // Mapeia code → MagicLinkErrorCode. Códigos opacos pro client.
      const mapped = this.mapErrorCode(code);
      res.redirect(buildMagicErrorRedirect(loginUrl, mapped));
    }
  }

  // ==========================================================================
  // Helpers internos
  // ==========================================================================

  /**
   * Wrapper sobre `provider.sendMagicLink` que respeita o contrato fire-and-forget:
   * - Aguarda síncrono pro caller fazer delay constante anti-timing.
   * - NÃO propaga sucesso/falha pro response (anti-enum).
   */
  private async sendMagicLinkSafe(
    provider: EmailMagicLinkProvider,
    params: { email: string; tenantSlug: string; appUrl: string },
  ): Promise<void> {
    await provider.sendMagicLink(params);
  }

  /**
   * Delay constante 300ms desde `start` (D8.6.5). Equaliza tempo de resposta
   * pra esconder se o email existe, se o tenant existe, ou se o provider falhou.
   */
  private async constantTimeDelay(start: number): Promise<void> {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, 300 - elapsed);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }

  private cookieOptions(): CookieIssueOptions {
    const domain = this.env.get('COOKIE_DOMAIN');
    return {
      isProduction: this.env.get('NODE_ENV') === 'production',
      ...(domain ? { domain } : {}),
    };
  }

  private webBaseUrl(): string {
    return this.env.get('WEB_BASE_URL');
  }

  /**
   * Mapeia error code lançado pelo provider/adapter pro enum MagicLinkErrorCode.
   * Códigos não-mapeados viram CALLBACK_FAILED (catch-all opaco).
   */
  private mapErrorCode(code: string | undefined): MagicLinkErrorCode {
    switch (code) {
      case MagicLinkErrorCode.TOKEN_INVALID:
        return MagicLinkErrorCode.TOKEN_INVALID;
      case MagicLinkErrorCode.TOKEN_EXPIRED:
        return MagicLinkErrorCode.TOKEN_EXPIRED;
      case MagicLinkErrorCode.TOKEN_USED:
        return MagicLinkErrorCode.TOKEN_USED;
      case MagicLinkErrorCode.TENANT_MISMATCH:
        return MagicLinkErrorCode.TENANT_MISMATCH;
      case 'EMAIL_PROVIDER_UNAVAILABLE':
        return MagicLinkErrorCode.EMAIL_PROVIDER_UNAVAILABLE;
      default:
        return MagicLinkErrorCode.CALLBACK_FAILED;
    }
  }
}
