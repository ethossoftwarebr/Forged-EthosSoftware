/**
 * Códigos de erro OAuth (D8.5.5) — usados pelo callback handler pra redirecionar
 * o usuário com `?error=<code>` na URL de login. UI mostra mensagem amigável
 * traduzida via i18n a partir do código.
 *
 * Todos os códigos são opacos pro client (não revelam stack/PII).
 */

export const OAuthErrorCode = {
  /** State cookie tampered ou assinatura JWS falha. */
  STATE_INVALID: 'oauth_state_invalid',
  /** State cookie expirou (>5min sem callback). */
  STATE_EXPIRED: 'oauth_state_expired',
  /** id_token retornou `email_verified=false` — recusa criar conta. */
  EMAIL_UNVERIFIED: 'oauth_email_unverified',
  /** Nome de provider não registrado no factory. */
  PROVIDER_UNAVAILABLE: 'oauth_provider_unavailable',
  /** Não foi possível resolver tenant do subdomain — user precisa escolher. */
  MARKETPLACE_REQUIRED: 'oauth_marketplace_required',
  /** Catch-all — logar detalhes server-side, expor só o code. */
  CALLBACK_FAILED: 'oauth_callback_failed',
} as const;

export type OAuthErrorCode = (typeof OAuthErrorCode)[keyof typeof OAuthErrorCode];

/**
 * Lista imutável de todos os códigos — útil pra testes de cobertura.
 */
export const ALL_OAUTH_ERROR_CODES: readonly OAuthErrorCode[] = Object.freeze(
  Object.values(OAuthErrorCode),
);

/**
 * Constrói URL de redirect pra página de login com query param de erro.
 * `loginUrl` pode ser absoluto (`https://app.com/login`) ou relativo (`/login`).
 * Preserva query string existente, apenas anexando `error=`.
 */
export function buildErrorRedirect(loginUrl: string, code: OAuthErrorCode): string {
  const separator = loginUrl.includes('?') ? '&' : '?';
  return `${loginUrl}${separator}error=${encodeURIComponent(code)}`;
}
