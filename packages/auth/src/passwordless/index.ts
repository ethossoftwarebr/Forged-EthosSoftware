/**
 * Sub-barrel @ethos/auth/passwordless (W1.B do #8.6).
 *
 * Importação:
 *   import { EmailMagicLinkProvider, MagicLinkErrorCode } from '@ethos/auth/passwordless';
 *
 * O root barrel (`@ethos/auth`) reexporta `PasswordlessProvider` type. Esses
 * símbolos são exclusivos do flow Magic Link.
 */

export {
  EmailMagicLinkProvider,
  type EmailMagicLinkProviderConfig,
} from './email-magic-link.provider';

export {
  MagicLinkErrorCode,
  ALL_MAGIC_LINK_ERROR_CODES,
  buildMagicErrorRedirect,
} from './error-codes';

// Re-export interface pra consumers do subpath
export type { PasswordlessProvider } from '../passwordless';
