// Tipos compartilhados
export type {
  AuthRole,
  JwtPayload,
  AuthSession,
  RegisterInput,
  LoginCredentials,
  IssuedTokens,
  AuthError,
  MfaSetupPayload,
  MfaChallengeResult,
  LoginResult,
} from './types';

// Crypto: argon2id (D1)
export { hashPassword, verifyPassword, hashToken, verifyTokenHash } from './hash';

// JWT: jose + EdDSA + hardening D13
export {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  type SignAccessTokenOptions,
  type VerifyAccessTokenOptions,
} from './jwt';

// JWKS: kid rotation (D13.4)
export {
  loadKeysetFromEnv,
  resolveVerificationKey,
  generateEd25519Keypair,
  type JwtKeyMaterial,
  type JwtKeyset,
} from './jwks';

// Adapter pattern (D14.1) — AuthAdapter interface + NativeAuthAdapter (default impl)
export type { AuthAdapter } from './adapter';
export { NativeAuthAdapter } from './native-adapter';

// Interfaces sem impl (D14.5 + D12) — concretas em #8.5 / #8.6 / #8.7
export type { OAuthProvider, OAuthTokens, OAuthProfile } from './oauth';
export type { MfaProvider } from './mfa';
export type { PasswordlessProvider } from './passwordless';

// OAuth (D8.5) — providers + helpers, implementação concreta em #8.5 (W1.A).
// Re-exports do subtree ./oauth/* (PKCE, state cookie, crypto, error codes, providers).
export {
  GoogleProvider,
  MicrosoftProvider,
  signStateCookie,
  verifyStateCookie,
  StateCookieError,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
  genVerifier,
  genChallenge,
  encryptToken,
  decryptToken,
  parseEncryptionKey,
  buildErrorRedirect,
  OAuthErrorCode,
} from './oauth/index';
export type { OAuthStatePayload } from './oauth/index';

// Passwordless / Magic Link (D8.6) — provider concreto + error codes.
// Re-exports do subtree ./passwordless/* (W1.B do #8.6).
export {
  EmailMagicLinkProvider,
  MagicLinkErrorCode,
  ALL_MAGIC_LINK_ERROR_CODES,
  buildMagicErrorRedirect,
} from './passwordless/index';
export type { EmailMagicLinkProviderConfig } from './passwordless/index';

// MFA / TOTP (D8.7) — provider concreto + backup codes + error codes.
// Re-exports do subtree ./mfa/* (W1 do #8.7).
export {
  OtplibTotpProvider,
  BACKUP_CODE_ALPHABET,
  BACKUP_CODE_LENGTH,
  BACKUP_CODE_COUNT,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  MfaErrorCode,
  ALL_MFA_ERROR_CODES,
} from './mfa/index';
export type { TotpProvider, TotpSetupResult } from './mfa/index';
