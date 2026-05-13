/**
 * Sub-barrel @ethos/auth/oauth (W1.A do #8.5).
 *
 * Importação:
 *   import { GoogleProvider, signStateCookie, ... } from '@ethos/auth/oauth';
 *
 * O root barrel (`@ethos/auth`) reexporta seletivamente o que faz sentido na
 * API pública geral. Esses símbolos aqui são exclusivos do flow OAuth.
 */

// PKCE
export { genVerifier, genChallenge, assertS256, isValidVerifierLength } from './pkce';

// Crypto pra refresh token at-rest
export { encryptToken, decryptToken, parseEncryptionKey } from './oauth-crypto';

// Códigos de erro padronizados
export {
  OAuthErrorCode,
  ALL_OAUTH_ERROR_CODES,
  buildErrorRedirect,
  type OAuthErrorCode as OAuthErrorCodeType,
} from './error-codes';

// State cookie JWS
export {
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
  signStateCookie,
  verifyStateCookie,
  StateCookieError,
  type OAuthStatePayload,
  type StateCookieAttributes,
} from './state-cookie';

// Providers concretos
export { GoogleProvider, type GoogleProviderConfig } from './google.provider';
export { MicrosoftProvider, type MicrosoftProviderConfig } from './microsoft.provider';

// Interface re-exports (W5 review fix) — manter coerente com a documentação do JSDoc
// acima: subpath @ethos/auth/oauth deve expor TUDO necessário pra implementar / consumir
// um provider novo (ex: GithubProvider em um package separado pós-v1).
export type { OAuthProvider, OAuthTokens, OAuthProfile } from '../oauth';
