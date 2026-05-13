import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';

import { resolveVerificationKey, type JwtKeyset } from '../jwks';

/**
 * State + PKCE storage via cookie httpOnly JWS (D8.5.3).
 *
 * Decidido NÃO usar Redis: reduz infra obrigatória e mantém o starter
 * 100% stateless. Payload é assinado (não cifrado) com `JwtKeyset` (EdDSA +
 * kid rotation). Mesma chave do access token — reuso intencional pra evitar
 * gerenciar 2 keysets.
 *
 * Cookie:
 *   nome     `__oauth_state`
 *   httpOnly true
 *   secure   true (em prod — caller decide via NODE_ENV)
 *   sameSite 'lax'  (NÃO 'strict' — callback OAuth é cross-site redirect)
 *   path     '/'
 *   maxAge   300s (5min)
 */

export const OAUTH_STATE_COOKIE_NAME = '__oauth_state';
export const OAUTH_STATE_COOKIE_MAX_AGE_SECONDS = 300;
const ISSUER = 'ethos-oauth';
const ALG = 'EdDSA' as const;

export interface OAuthStatePayload {
  /** Nonce CSRF (≥16 bytes random, base64url). */
  state: string;
  /** PKCE code_verifier original (43-128 chars). */
  codeVerifier: string;
  /** Nonce OIDC pra binding ao id_token. */
  nonce: string;
  /** Provider que originou o flow ('google' | 'microsoft' | ...). */
  provider: string;
  /** redirect_uri exato passado pro authorize (será revalidado no token exchange). */
  redirectUri: string;
  /** Tenant resolvido por subdomain (opcional — pode estar vazio em marketplace). */
  tenantSlug?: string;
  /** Caminho pra retornar após login (opcional, mesma origem). */
  returnTo?: string;
}

export interface StateCookieAttributes {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
}

export class StateCookieError extends Error {
  constructor(
    public readonly reason: 'invalid' | 'expired',
    message: string,
  ) {
    super(message);
    this.name = 'StateCookieError';
  }
}

/**
 * Assina o payload e retorna o valor pronto pra setar no cookie + atributos
 * recomendados. Caller (NestJS @Res ou Next.js Response.cookies) decide
 * `secure` baseado em env (prod=true).
 */
export async function signStateCookie(
  payload: OAuthStatePayload,
  keyset: JwtKeyset,
  options: { secure?: boolean; maxAgeSeconds?: number } = {},
): Promise<StateCookieAttributes> {
  if (!keyset.current.privateKey) {
    throw new Error('Keyset.current.privateKey ausente — não é possível assinar state cookie.');
  }
  const maxAge = options.maxAgeSeconds ?? OAUTH_STATE_COOKIE_MAX_AGE_SECONDS;
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + maxAge;

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG, kid: keyset.current.kid })
    .setIssuer(ISSUER)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(keyset.current.privateKey);

  return {
    name: OAUTH_STATE_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: options.secure ?? true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

/**
 * Verifica state cookie. Retorna payload se válido. Lança {@link StateCookieError}
 * com `reason='expired'` se exp passou, `reason='invalid'` em qualquer outro
 * erro de assinatura/formato.
 */
export async function verifyStateCookie(
  cookieValue: string,
  keyset: JwtKeyset,
): Promise<OAuthStatePayload> {
  // Decode header pra resolver kid (mesmo pattern de verifyAccessToken).
  const headerB64 = cookieValue.split('.')[0];
  if (!headerB64) {
    throw new StateCookieError('invalid', 'state cookie malformado');
  }
  let kid: string | undefined;
  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8')) as {
      kid?: string;
    };
    kid = header.kid;
  } catch {
    throw new StateCookieError('invalid', 'state cookie header malformado');
  }

  const publicKey = resolveVerificationKey(keyset, kid);
  if (!publicKey) {
    throw new StateCookieError('invalid', 'state cookie kid desconhecido');
  }

  try {
    const { payload } = await jwtVerify(cookieValue, publicKey, {
      algorithms: [ALG],
      issuer: ISSUER,
    });
    return assertStatePayload(payload);
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      throw new StateCookieError('expired', 'state cookie expirado');
    }
    if (err instanceof StateCookieError) throw err;
    throw new StateCookieError('invalid', `state cookie inválido: ${(err as Error).message}`);
  }
}

function assertStatePayload(payload: unknown): OAuthStatePayload {
  const p = payload as Record<string, unknown>;
  const state = p.state;
  const codeVerifier = p.codeVerifier;
  const nonce = p.nonce;
  const provider = p.provider;
  const redirectUri = p.redirectUri;
  if (
    typeof state !== 'string' ||
    typeof codeVerifier !== 'string' ||
    typeof nonce !== 'string' ||
    typeof provider !== 'string' ||
    typeof redirectUri !== 'string'
  ) {
    throw new StateCookieError('invalid', 'state cookie payload incompleto');
  }
  return {
    state,
    codeVerifier,
    nonce,
    provider,
    redirectUri,
    tenantSlug: typeof p.tenantSlug === 'string' ? p.tenantSlug : undefined,
    returnTo: typeof p.returnTo === 'string' ? p.returnTo : undefined,
  };
}
