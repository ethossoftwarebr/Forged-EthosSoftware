import type { EmailMagicLinkProvider } from '@ethos/auth';
import type { EmailAdapter } from '@ethos/email';

/**
 * Tokens DI usados pelo flow Magic Link (D8.6).
 *
 * Mantidos em arquivo dedicado pra evitar import cycle entre o factory
 * (`auth.module.ts`), o controller (`magic-link.controller.ts`) e o
 * `EmailMagicLinkProvider`.
 *
 * Graceful degradation (D8.6.8): tipos `OrNull` permitem que o factory
 * registre `null` quando `RESEND_API_KEY` não está presente, sem quebrar o boot.
 * Controller checa null em runtime e responde 503/redirect.
 */

/** EmailAdapter concreto (ResendAdapter) — null se `RESEND_API_KEY` ausente. */
export const EMAIL_ADAPTER_TOKEN = Symbol('EMAIL_ADAPTER');
export type EmailAdapterOrNull = EmailAdapter | null;

/** Provider concreto Magic Link — null se EmailAdapter null (DI cascata). */
export const MAGIC_LINK_PROVIDER_TOKEN = Symbol('MAGIC_LINK_PROVIDER');
export type MagicLinkProviderOrNull = EmailMagicLinkProvider | null;
