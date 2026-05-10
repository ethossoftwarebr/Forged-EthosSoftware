import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';

import { resolveVerificationKey, type JwtKeyset } from './jwks';
import type { JwtPayload, AuthSession } from './types';

/**
 * JWT (D2 + D13) — jose lib + 9 guards de hardening:
 *   D13.1  Algoritmo único: EdDSA (Ed25519)
 *   D13.2  algorithms: ['EdDSA'] obrigatório em jwtVerify
 *   D13.3  iss + aud setados E verificados
 *   D13.4  kid header + JWKS rotation
 *   D13.5  refresh token armazenado hasheado em DB (não aqui — caller responsibility)
 *   D13.6  payload mínimo (sub, tid, roles)
 *   D13.7  cookies httpOnly+secure+sameSite=strict (caller responsibility)
 *   D13.8  ESLint rule jose-require-algorithms (em @ethos/config/eslint/rules)
 *   D13.9  AC #11 E2E forja alg=HS256 → 401
 */

const ALG = 'EdDSA' as const;

const ACCESS_TOKEN_TTL_SECONDS = parseInt(process.env.JWT_ACCESS_TTL_SECONDS ?? '900', 10); // 15min (D5)
const REFRESH_TOKEN_TTL_SECONDS = parseInt(
  process.env.JWT_REFRESH_TTL_SECONDS ?? '2592000', // 30d (D5)
  10,
);

const DEFAULT_ISSUER = process.env.JWT_ISSUER ?? 'ethos-forge';
const DEFAULT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'ethos-api';

export interface SignAccessTokenOptions {
  issuer?: string;
  audience?: string;
  ttlSeconds?: number;
}

/**
 * Assina access token. Payload é mínimo (D13.6) — caller deve passar apenas
 * sub/tid/roles. Lib NUNCA aceita PII (email, name, etc.) por design.
 */
export async function signAccessToken(
  keyset: JwtKeyset,
  payload: JwtPayload,
  options: SignAccessTokenOptions = {},
): Promise<{ token: string; expiresAt: Date }> {
  if (!keyset.current.privateKey) {
    throw new Error('Keyset.current.privateKey ausente — não é possível assinar.');
  }

  const ttl = options.ttlSeconds ?? ACCESS_TOKEN_TTL_SECONDS;
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ttl;

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG, kid: keyset.current.kid })
    .setIssuer(options.issuer ?? DEFAULT_ISSUER)
    .setAudience(options.audience ?? DEFAULT_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setSubject(payload.sub)
    .sign(keyset.current.privateKey);

  return { token, expiresAt: new Date(expiresAt * 1000) };
}

export interface VerifyAccessTokenOptions {
  issuer?: string;
  audience?: string;
}

/**
 * Verifica access token com algorithms: ['EdDSA'] PINADO (D13.2 — guard contra
 * Algorithm Confusion). Resolve kid via JWKS.
 */
export async function verifyAccessToken(
  keyset: JwtKeyset,
  token: string,
  options: VerifyAccessTokenOptions = {},
): Promise<AuthSession> {
  // Decode header sem assinar pra resolver kid
  const headerB64 = token.split('.')[0];
  if (!headerB64) {
    throw new Error('TOKEN_INVALID: token malformed');
  }
  let kid: string | undefined;
  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8')) as {
      kid?: string;
    };
    kid = header.kid;
  } catch {
    throw new Error('TOKEN_INVALID: header malformed');
  }

  const publicKey = resolveVerificationKey(keyset, kid);
  if (!publicKey) {
    throw new Error('TOKEN_INVALID: kid not found in keyset');
  }

  // jwtVerify com algorithms PINADO em ['EdDSA'] — D13.2.
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: [ALG],
    issuer: options.issuer ?? DEFAULT_ISSUER,
    audience: options.audience ?? DEFAULT_AUDIENCE,
  });

  return jwtPayloadToSession(payload);
}

function jwtPayloadToSession(payload: JoseJWTPayload): AuthSession {
  const sub = payload.sub;
  const tid = payload.tid as string | undefined;
  const roles = payload.roles as AuthSession['roles'] | undefined;
  const iat = payload.iat;
  const exp = payload.exp;

  if (!sub || !tid || !Array.isArray(roles) || !iat || !exp) {
    throw new Error('TOKEN_INVALID: payload incompleto (esperado sub/tid/roles/iat/exp)');
  }

  return {
    userId: sub,
    tenantId: tid,
    roles,
    issuedAt: iat,
    expiresAt: exp,
  };
}

/**
 * Gera string aleatória pra refresh token (não JWT). Caller hasheia via
 * argon2id antes de armazenar (D13.5). 256 bits de entropia.
 */
export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

export const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_SECONDS * 1000;
export const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_SECONDS * 1000;
