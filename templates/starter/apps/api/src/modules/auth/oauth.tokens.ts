import type { JwtKeyset, OAuthProvider } from '@ethos/auth';

/**
 * Tokens DI usados pelo flow OAuth (D8.5).
 *
 * Mantidos em arquivo dedicado pra evitar import cycle entre o factory
 * (`oauth-registry.provider.ts`), o controller (`oauth.controller.ts`) e o
 * `AuthModule`.
 */

/** Map `{providerName -> OAuthProvider}` populado no boot. */
export const OAUTH_REGISTRY_TOKEN = Symbol('OAUTH_REGISTRY');
export type OAuthRegistry = Map<string, OAuthProvider>;

/** JwtKeyset compartilhado (mesmo do access token) — usado pra assinar state cookie. */
export const OAUTH_KEYSET_TOKEN = Symbol('OAUTH_KEYSET');

/**
 * Buffer de 32 bytes pra cifrar OAuth refresh tokens at-rest. `null` quando
 * nenhum provider está configurado (env schema garante presença caso contrário).
 */
export const OAUTH_ENCRYPTION_KEY_TOKEN = Symbol('OAUTH_ENCRYPTION_KEY');
export type OAuthEncryptionKey = Buffer | null;

/** Re-exports tipados pra evitar `any` no consumer. */
export type { JwtKeyset, OAuthProvider };
