import { serialize, type SerializeOptions } from 'cookie';
import type { Request, Response } from 'express';

/**
 * Nome do cookie OAuth state — duplicado aqui (em vez de importar via
 * `@ethos/auth/oauth`) pra evitar resolução de subpath sob `moduleResolution=node`.
 * O nome é parte do contrato público com o `signStateCookie`/`verifyStateCookie`.
 */
const OAUTH_STATE_COOKIE_NAME = '__oauth_state';

/**
 * Helpers de cookie pro AuthController (D13.7).
 *
 * Strategy travada: `cookie` lib direto (D3) — sem middleware extra na escrita.
 * Cookie-parser entra só na leitura (main.ts) pra popular `request.cookies`
 * consumido pelo `JwtAuthGuard`.
 *
 * Atributos obrigatórios (D13.7):
 *  - httpOnly: JS no browser não lê
 *  - secure: só HTTPS (downgrade automático em dev/test)
 *  - sameSite=strict: CSRF defense
 *  - access  path=/api          ttl=15min  (alinha ACCESS_TOKEN_TTL_MS)
 *  - refresh path=/api/auth/refresh ttl=30d (alinha REFRESH_TOKEN_TTL_MS)
 */

export const ACCESS_COOKIE_NAME = 'access_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

const ACCESS_PATH = '/api';
const REFRESH_PATH = '/api/auth/refresh';

const ACCESS_MAX_AGE_SECONDS = 15 * 60; // 15min
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30d

export interface CookieIssueOptions {
  /**
   * Em production: secure=true (HTTPS-only) + cookie domain pode ser setado.
   * Em dev/test: secure=false pra funcionar em http://localhost.
   */
  isProduction: boolean;
  /**
   * Domain opcional (vem do COOKIE_DOMAIN env). Se vazio, browser usa host-only.
   */
  domain?: string;
}

function baseOptions(
  opts: CookieIssueOptions,
): Pick<SerializeOptions, 'httpOnly' | 'secure' | 'sameSite' | 'domain'> {
  return {
    httpOnly: true,
    secure: opts.isProduction,
    sameSite: 'strict',
    ...(opts.domain ? { domain: opts.domain } : {}),
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  opts: CookieIssueOptions,
): void {
  const base = baseOptions(opts);

  const access = serialize(ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...base,
    path: ACCESS_PATH,
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });

  const refresh = serialize(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...base,
    path: REFRESH_PATH,
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });

  // Append em vez de set — não sobrescreve outros Set-Cookie (e.g. CSRF futuro).
  const existing = res.getHeader('Set-Cookie');
  const list: string[] = Array.isArray(existing)
    ? (existing as string[]).slice()
    : typeof existing === 'string'
      ? [existing]
      : [];
  list.push(access, refresh);
  res.setHeader('Set-Cookie', list);
}

/**
 * State cookie pro OAuth flow (D8.5.3).
 *
 * Diferenças em relação aos cookies de sessão:
 *  - `path='/'` — o callback é em `/auth/:provider/callback`, fora do `/api`
 *    (este starter monta o controller na raiz, sem prefixo global).
 *  - `sameSite='lax'` — callback OAuth é cross-site GET (provider redireciona
 *    de https://accounts.google.com pra nossa origem). 'strict' bloquearia.
 *  - `maxAge=300s` — vida curta; user tem 5min pra completar o flow.
 *
 * Valor do cookie já vem assinado por `signStateCookie` (JWS EdDSA via keyset).
 */
const OAUTH_STATE_MAX_AGE_SECONDS = 5 * 60;

export function setOAuthStateCookie(res: Response, value: string, opts: CookieIssueOptions): void {
  const cookie = serialize(OAUTH_STATE_COOKIE_NAME, value, {
    httpOnly: true,
    secure: opts.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    ...(opts.domain ? { domain: opts.domain } : {}),
  });
  appendSetCookie(res, cookie);
}

export function clearOAuthStateCookie(res: Response, opts: CookieIssueOptions): void {
  const cookie = serialize(OAUTH_STATE_COOKIE_NAME, '', {
    httpOnly: true,
    secure: opts.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    ...(opts.domain ? { domain: opts.domain } : {}),
  });
  appendSetCookie(res, cookie);
}

export function getOAuthStateCookie(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string | undefined> }).cookies;
  return cookies?.[OAUTH_STATE_COOKIE_NAME];
}

function appendSetCookie(res: Response, value: string): void {
  const existing = res.getHeader('Set-Cookie');
  const list: string[] = Array.isArray(existing)
    ? (existing as string[]).slice()
    : typeof existing === 'string'
      ? [existing]
      : [];
  list.push(value);
  res.setHeader('Set-Cookie', list);
}

export function clearAuthCookies(res: Response, opts: CookieIssueOptions): void {
  const base = baseOptions(opts);

  // maxAge=0 + valor vazio = delete pro browser
  const access = serialize(ACCESS_COOKIE_NAME, '', {
    ...base,
    path: ACCESS_PATH,
    maxAge: 0,
  });

  const refresh = serialize(REFRESH_COOKIE_NAME, '', {
    ...base,
    path: REFRESH_PATH,
    maxAge: 0,
  });

  const existing = res.getHeader('Set-Cookie');
  const list: string[] = Array.isArray(existing)
    ? (existing as string[]).slice()
    : typeof existing === 'string'
      ? [existing]
      : [];
  list.push(access, refresh);
  res.setHeader('Set-Cookie', list);
}
