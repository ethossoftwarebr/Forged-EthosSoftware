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

/**
 * Payload do setup MFA (D8.7) — retornado por `setupMfa`. Secret bruto vai
 * pro UI montar o QR code; backend já encriptou + persistiu MfaSecret com
 * `verifiedAt=null` aguardando confirmação via primeiro código válido.
 *
 * O secret só permanece "candidato" — não é usado pra verificação até
 * `confirmMfaSetup` ser chamado com sucesso.
 */
export interface MfaSetupPayload {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
}

/**
 * Resultado de `verifyMfaChallenge` / `consumeBackupCode` (D8.7).
 * `reason` é opcional — só preenchido em falha. Caller mapeia pra HTTP status
 * via MfaErrorCode.
 */
export interface MfaChallengeResult {
  ok: boolean;
  reason?: 'invalid' | 'backup_used' | 'not_enabled';
}

/**
 * Resultado de login que pode requerer MFA (D8.7.7). Quando `requiresMfa=true`,
 * caller emite `mfaToken` (JWS short-lived, ~5min) pro frontend trocar pelo
 * fluxo completo de tokens após verificar TOTP/backup code. Assinatura do
 * mfaToken é responsabilidade do controller (W2), não da biblioteca.
 */
export interface LoginResult {
  session?: AuthSession;
  tokens?: IssuedTokens;
  requiresMfa?: boolean;
  mfaToken?: string;
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
    | 'MFA_REQUIRED'
    // D8.5.6 — OAuth login flow (loginWithOAuth)
    | 'EMAIL_NOT_VERIFIED' // anti-takeover: user existe mas emailVerified=null, recusa link automatico
    | 'MARKETPLACE_REQUIRED'; // user tem >1 memberships e nenhum tenantSlug foi fornecido — caller redireciona pro picker
  message: string;
}
