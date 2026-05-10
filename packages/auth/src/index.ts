// Tipos compartilhados
export type {
  AuthRole,
  JwtPayload,
  AuthSession,
  RegisterInput,
  LoginCredentials,
  IssuedTokens,
  AuthError,
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

// Adapter pattern (D14.1) — AuthAdapter interface (NativeAuthAdapter impl no proximo commit)
export type { AuthAdapter } from './adapter';

// Interfaces sem impl (D14.5 + D12) — concretas em #8.5 / #8.6 / #8.7
export type { OAuthProvider, OAuthTokens, OAuthProfile } from './oauth';
export type { MfaProvider } from './mfa';
export type { PasswordlessProvider } from './passwordless';
