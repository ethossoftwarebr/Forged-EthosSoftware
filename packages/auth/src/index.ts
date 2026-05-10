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
