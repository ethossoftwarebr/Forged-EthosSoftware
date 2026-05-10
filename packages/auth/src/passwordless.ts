import type { AuthSession, IssuedTokens } from './types';

/**
 * PasswordlessProvider (D14.5) — interface pra Magic Link / OTP via email.
 *
 * Implementação concreta (`EmailMagicLinkProvider`) fica pra **spec #8.6**.
 * Schema (MagicLinkToken table) já está pronto desde o #8. Email backend
 * (Resend/SendGrid) virá via `@ethos/email` (package criado no #8.6).
 */

export interface PasswordlessProvider {
  /**
   * Gera token único, hasheia (argon2id), persiste em MagicLinkToken,
   * envia email com link `${appUrl}/auth/magic/verify?token=${plaintext}`.
   * Token expira em 15min (config via env).
   */
  sendMagicLink(params: { email: string; tenantSlug: string; appUrl: string }): Promise<void>;

  /**
   * Verifica token recebido no callback. Cria User se ainda não existe
   * (registro automático pós-magic-link), cria membership no tenant, emite
   * tokens. Token é single-use — set usedAt após consumo.
   */
  verifyToken(token: string): Promise<{ session: AuthSession; tokens: IssuedTokens }>;
}
