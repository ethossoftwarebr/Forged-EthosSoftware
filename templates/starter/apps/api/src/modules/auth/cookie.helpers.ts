import { serialize, type SerializeOptions } from 'cookie';
import type { Response } from 'express';

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
