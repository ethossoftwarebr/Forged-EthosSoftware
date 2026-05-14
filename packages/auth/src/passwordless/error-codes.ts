/**
 * Códigos de erro Magic Link (D8.6 spec) — usados pelo verify handler pra redirecionar
 * o usuário com `?error=<code>` na URL de login. UI mostra mensagem amigável
 * traduzida via i18n a partir do código.
 *
 * Todos os códigos são opacos pro client (não revelam stack/PII).
 * Espelha o shape de `oauth/error-codes.ts` pra consistência.
 */

export const MagicLinkErrorCode = {
  /** Token plaintext não corresponde a nenhum hash (ou MagicLinkToken não existe). */
  TOKEN_INVALID: 'magic_token_invalid',
  /** Token achado mas `expiresAt < now()`. */
  TOKEN_EXPIRED: 'magic_token_expired',
  /** Token achado mas `usedAt !== null` — replay detectado. */
  TOKEN_USED: 'magic_token_used',
  /** Rate-limit atingido no request endpoint (silencioso na response, mas registrado). */
  REQUEST_THROTTLED: 'magic_request_throttled',
  /** Tenant resolvido no callback (subdomain) ≠ tenant gravado no MagicLinkToken. */
  TENANT_MISMATCH: 'magic_tenant_mismatch',
  /** EmailAdapter indisponível (RESEND_API_KEY ausente ou provider down). */
  EMAIL_PROVIDER_UNAVAILABLE: 'magic_email_provider_unavailable',
  /** Catch-all — logar detalhes server-side, expor só o code. */
  CALLBACK_FAILED: 'magic_callback_failed',
} as const;

export type MagicLinkErrorCode = (typeof MagicLinkErrorCode)[keyof typeof MagicLinkErrorCode];

/**
 * Lista imutável de todos os códigos — útil pra testes de cobertura.
 */
export const ALL_MAGIC_LINK_ERROR_CODES: readonly MagicLinkErrorCode[] = Object.freeze(
  Object.values(MagicLinkErrorCode),
);

/**
 * Constrói URL de redirect pra página de login com query param de erro.
 * `loginUrl` pode ser absoluto (`https://app.com/login`) ou relativo (`/login`).
 * Preserva query string existente, apenas anexando `error=`.
 */
export function buildMagicErrorRedirect(loginUrl: string, code: MagicLinkErrorCode): string {
  const separator = loginUrl.includes('?') ? '&' : '?';
  return `${loginUrl}${separator}error=${encodeURIComponent(code)}`;
}
