import { randomBytes } from 'node:crypto';

import { AUTH_ADAPTER_TOKEN, Public } from '@ethos/api-base';
import {
  buildErrorRedirect,
  genChallenge,
  genVerifier,
  OAuthErrorCode,
  signStateCookie,
  verifyStateCookie,
  type AuthAdapter,
  type JwtKeyset,
  type OAuthStatePayload,
} from '@ethos/auth';
import { Controller, Get, Inject, Logger, Param, Query, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { EnvService } from '../../config/env.module';

import {
  clearOAuthStateCookie,
  getOAuthStateCookie,
  setAuthCookies,
  setOAuthStateCookie,
  type CookieIssueOptions,
} from './cookie.helpers';
import {
  OAUTH_ENCRYPTION_KEY_TOKEN,
  OAUTH_KEYSET_TOKEN,
  OAUTH_REGISTRY_TOKEN,
  type OAuthRegistry,
} from './oauth.tokens';

/**
 * OAuthController (D8.5) — implementa Authorization Code Flow + PKCE pros
 * providers registrados (Google/Microsoft em V1, extensible via `OAuthRegistry`).
 *
 * Endpoints:
 *   GET /auth/:provider           → 302 pro authorize URL do IdP
 *   GET /auth/:provider/callback  → 302 pro web (sucesso=/dashboard, erro=/login?error=...)
 *   GET /auth/providers           → lista de providers registrados (UI consome)
 *
 * Regras críticas:
 *  - `tenantSlug` SEMPRE vem do subdomain (D8.5.1) — nunca do query/body.
 *  - State cookie é JWS assinado (D8.5.3) — tamper-proof + expira em 5min.
 *  - Erros redirecionam pra `${WEB_BASE_URL}/login?error=oauth_*` (D8.5.5);
 *    o user nunca vê JSON cru do callback.
 *  - Tokens do provider são encriptados antes de gravar (`encryptionKey` passado
 *    pro `adapter.loginWithOAuth`).
 */
@ApiTags('auth')
@Controller('auth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly env: EnvService,
    @Inject(OAUTH_REGISTRY_TOKEN) private readonly registry: OAuthRegistry,
    @Inject(OAUTH_KEYSET_TOKEN) private readonly keyset: JwtKeyset,
    @Inject(OAUTH_ENCRYPTION_KEY_TOKEN) private readonly encryptionKey: Buffer | null,
    @Inject(AUTH_ADAPTER_TOKEN) private readonly adapter: AuthAdapter,
  ) {}

  // ==========================================================================
  // GET /auth/providers — lista providers registrados (UI)
  // ==========================================================================

  @Public()
  @Get('providers')
  @ApiOkResponse({ description: 'Lista providers OAuth registrados no boot.' })
  listProviders(): { providers: Array<{ name: string; label: string }> } {
    const providers = Array.from(this.registry.keys()).map((name) => ({
      name,
      label: capitalize(name),
    }));
    return { providers };
  }

  // ==========================================================================
  // GET /auth/:provider — inicia o flow (302 pro IdP)
  // ==========================================================================

  @Public()
  @Get(':provider')
  async start(
    @Param('provider') providerName: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('returnTo') returnTo?: string,
  ): Promise<void> {
    const provider = this.registry.get(providerName);
    if (!provider) {
      // D8.5.5: todos erros redirecionam pra /login?error=*. UI lida com o code.
      // (Express ignora res.status() depois de res.redirect — não setamos 404 aqui.)
      res.redirect(this.errorRedirect(OAuthErrorCode.PROVIDER_UNAVAILABLE));
      return;
    }
    if (!this.encryptionKey) {
      // Defensive: encryption key validation já é feita no env schema, mas
      // re-checa aqui pra fail-safe se o provider foi registrado por bug.
      this.logger.error('OAUTH_TOKEN_ENCRYPTION_KEY ausente — abortando flow.');
      res.redirect(this.errorRedirect(OAuthErrorCode.CALLBACK_FAILED));
      return;
    }

    const tenantSlug = extractTenantSlug(req);
    const codeVerifier = genVerifier();
    const codeChallenge = genChallenge(codeVerifier);
    // state nonce ≥16 bytes (RFC 6749 §10.12) — base64url-safe.
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(16).toString('base64url');
    const redirectUri = this.resolveRedirectUri(providerName);

    const payload: OAuthStatePayload = {
      state,
      codeVerifier,
      nonce,
      provider: providerName,
      redirectUri,
      ...(tenantSlug ? { tenantSlug } : {}),
      ...(returnTo && isSafeReturnTo(returnTo) ? { returnTo } : {}),
    };

    const cookieAttrs = await signStateCookie(payload, this.keyset, {
      secure: this.env.get('NODE_ENV') === 'production',
    });
    setOAuthStateCookie(res, cookieAttrs.value, this.cookieOptions());

    const authUrl = provider.getAuthUrl({ state, codeChallenge, redirectUri });
    res.redirect(authUrl);
  }

  // ==========================================================================
  // GET /auth/:provider/callback — troca code + emite tokens
  // ==========================================================================

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') providerName: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') stateQuery?: string,
    @Query('error') providerError?: string,
  ): Promise<void> {
    // 1. Erro vindo do provider (user cancelou ou IdP rejeitou).
    if (providerError) {
      this.logger.warn(`OAuth provider error (${providerName}): ${providerError}`);
      clearOAuthStateCookie(res, this.cookieOptions());
      res.redirect(this.errorRedirect(OAuthErrorCode.CALLBACK_FAILED));
      return;
    }

    const provider = this.registry.get(providerName);
    if (!provider) {
      res.redirect(this.errorRedirect(OAuthErrorCode.PROVIDER_UNAVAILABLE));
      return;
    }

    // 2. State cookie deve existir.
    const stateCookie = getOAuthStateCookie(req);
    if (!stateCookie) {
      res.redirect(this.errorRedirect(OAuthErrorCode.STATE_INVALID));
      return;
    }

    // 3. Verifica state cookie (assinatura + exp).
    let statePayload: OAuthStatePayload;
    try {
      statePayload = await verifyStateCookie(stateCookie, this.keyset);
    } catch (err) {
      clearOAuthStateCookie(res, this.cookieOptions());
      // Duck-type: StateCookieError não é exportado pelo barrel root do @ethos/auth.
      // Identificamos via `name` + `reason` (estável — sai do mesmo package).
      const reason = (err as { name?: string; reason?: string } | null)?.reason;
      if (reason === 'expired') {
        res.redirect(this.errorRedirect(OAuthErrorCode.STATE_EXPIRED));
        return;
      }
      res.redirect(this.errorRedirect(OAuthErrorCode.STATE_INVALID));
      return;
    }

    // 4. State query deve bater com o do cookie (defesa contra mix-up).
    if (!code || !stateQuery || stateQuery !== statePayload.state) {
      clearOAuthStateCookie(res, this.cookieOptions());
      res.redirect(this.errorRedirect(OAuthErrorCode.STATE_INVALID));
      return;
    }

    // 5. Provider name no cookie deve bater com o da URL.
    if (statePayload.provider !== providerName) {
      clearOAuthStateCookie(res, this.cookieOptions());
      res.redirect(this.errorRedirect(OAuthErrorCode.STATE_INVALID));
      return;
    }

    if (!this.encryptionKey) {
      this.logger.error('OAUTH_TOKEN_ENCRYPTION_KEY ausente no callback.');
      clearOAuthStateCookie(res, this.cookieOptions());
      res.redirect(this.errorRedirect(OAuthErrorCode.CALLBACK_FAILED));
      return;
    }

    // 6. Exchange code + verify id_token.
    let tokens: Awaited<ReturnType<typeof provider.exchangeCode>>;
    let profile: Awaited<ReturnType<typeof provider.verifyIdToken>>;
    try {
      tokens = await provider.exchangeCode({
        code,
        codeVerifier: statePayload.codeVerifier,
        redirectUri: statePayload.redirectUri,
      });
      if (!tokens.idToken) {
        throw new Error('Provider não retornou id_token.');
      }
      profile = await provider.verifyIdToken(tokens.idToken);
    } catch (err) {
      this.logger.warn(
        `OAuth callback exchange falhou (${providerName}): ${(err as Error).message}`,
      );
      clearOAuthStateCookie(res, this.cookieOptions());
      // Email não verificado em alguns providers vira erro no verifyIdToken.
      if (/email_verified=false/i.test((err as Error).message)) {
        res.redirect(this.errorRedirect(OAuthErrorCode.EMAIL_UNVERIFIED));
        return;
      }
      res.redirect(this.errorRedirect(OAuthErrorCode.CALLBACK_FAILED));
      return;
    }

    // 7. Adapter loginWithOAuth.
    const uaHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(uaHeader) ? uaHeader[0] : uaHeader;
    try {
      const result = await this.adapter.loginWithOAuth({
        provider: providerName,
        profile,
        tokens,
        ...(statePayload.tenantSlug ? { tenantSlug: statePayload.tenantSlug } : {}),
        encryptionKey: this.encryptionKey,
        ...(userAgent ? { userAgent } : {}),
        ...(req.ip ? { ip: req.ip } : {}),
      });

      // 8. Set cookies de sessão + clear state cookie.
      setAuthCookies(res, result.tokens, this.cookieOptions());
      clearOAuthStateCookie(res, this.cookieOptions());

      const returnTo =
        statePayload.returnTo && isSafeReturnTo(statePayload.returnTo)
          ? statePayload.returnTo
          : '/dashboard';
      res.redirect(`${this.webBaseUrl()}${returnTo}`);
    } catch (err) {
      clearOAuthStateCookie(res, this.cookieOptions());
      const code = (err as Error & { code?: string }).code;
      this.logger.warn(
        `OAuth loginWithOAuth falhou (${providerName}, code=${code}): ${(err as Error).message}`,
      );
      switch (code) {
        case 'EMAIL_NOT_VERIFIED':
          res.redirect(this.errorRedirect(OAuthErrorCode.EMAIL_UNVERIFIED));
          return;
        case 'MARKETPLACE_REQUIRED':
          res.redirect(this.errorRedirect(OAuthErrorCode.MARKETPLACE_REQUIRED));
          return;
        case 'TENANT_NOT_FOUND':
        default:
          res.redirect(this.errorRedirect(OAuthErrorCode.CALLBACK_FAILED));
          return;
      }
    }
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

  private webBaseUrl(): string {
    return this.env.get('WEB_BASE_URL');
  }

  private errorRedirect(code: (typeof OAuthErrorCode)[keyof typeof OAuthErrorCode]): string {
    return buildErrorRedirect(`${this.webBaseUrl()}/login`, code);
  }

  private resolveRedirectUri(providerName: string): string {
    if (providerName === 'google') {
      const uri = this.env.get('GOOGLE_REDIRECT_URI');
      if (!uri)
        throw new Error('GOOGLE_REDIRECT_URI ausente — provider não deveria estar registrado.');
      return uri;
    }
    if (providerName === 'microsoft') {
      const uri = this.env.get('MICROSOFT_REDIRECT_URI');
      if (!uri) {
        throw new Error('MICROSOFT_REDIRECT_URI ausente — provider não deveria estar registrado.');
      }
      return uri;
    }
    throw new Error(`Provider desconhecido sem redirect_uri configurado: ${providerName}`);
  }
}

// ============================================================================
// Helpers de módulo (puros, testáveis)
// ============================================================================

/**
 * Resolve tenant slug pelo subdomain do Host header (D8.5.1).
 *
 * Regras:
 *  - Host com formato `<slug>.<rest>` onde `<rest>` tem ≥1 ponto → slug é o
 *    primeiro segmento.
 *  - Slugs reservados (`app`, `www`, `localhost`) viram undefined (marketplace).
 *  - IPv4/IPv6/sem subdomain → undefined.
 *
 * Nunca lê tenant do query/body — multi-tenant rule do CLAUDE.md.
 */
export function extractTenantSlug(req: Request): string | undefined {
  const host = (req.headers['host'] ?? '').toString().split(':')[0]?.toLowerCase();
  if (!host) return undefined;
  if (host === 'localhost') return undefined;
  // IPv4 simples (não cobre IPv6 — Host header em IPv6 vem com colchetes).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return undefined;

  const parts = host.split('.');
  if (parts.length < 3) return undefined; // precisa de pelo menos `slug.domain.tld`
  const candidate = parts[0];
  if (!candidate) return undefined;
  const reserved = new Set(['app', 'www', 'localhost', 'api']);
  if (reserved.has(candidate)) return undefined;
  return candidate;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Valida `returnTo` pra evitar open-redirect: só aceita paths relativos
 * iniciando em `/` e sem `//` (protocol-relative) ou `..`.
 */
function isSafeReturnTo(value: string): boolean {
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.includes('..')) return false;
  return true;
}
