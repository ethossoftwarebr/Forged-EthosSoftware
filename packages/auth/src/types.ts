/**
 * Tipos compartilhados de auth — @ethos/auth não depende de NestJS nem Next.
 * Quem injeta esses tipos é o @ethos/api-base (server) e os hooks (web/mobile).
 */

export type AuthRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

/**
 * Payload mínimo do access token (D13.6 — proibido PII).
 * sub = userId (subject claim), tid = tenantId, roles = [Role].
 * Os claims iss/aud/iat/exp/kid são adicionados pelo signer.
 */
export interface JwtPayload {
  sub: string;
  tid: string;
  roles: AuthRole[];
}

/**
 * Sessão decodificada do token + flags úteis pro guard.
 */
export interface AuthSession {
  userId: string;
  tenantId: string;
  roles: AuthRole[];
  issuedAt: number;
  expiresAt: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  tenantSlug: string; // tenant onde o user vai virar membro (ou criar)
  tenantName?: string; // só usado se for novo tenant
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug: string;
  userAgent?: string;
  ip?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface AuthError {
  code:
    | 'INVALID_CREDENTIALS'
    | 'ACCOUNT_LOCKED'
    | 'EMAIL_TAKEN'
    | 'TENANT_NOT_FOUND'
    | 'NOT_A_MEMBER'
    | 'TOKEN_EXPIRED'
    | 'TOKEN_INVALID'
    | 'TOKEN_REUSED'
    | 'MFA_REQUIRED';
  message: string;
}
