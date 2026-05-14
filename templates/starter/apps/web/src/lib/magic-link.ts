/**
 * Magic Link helpers (D8.6.5, D8.6.7).
 *
 * Estratégia anti-enumeração: o backend SEMPRE retorna 200 no
 * `POST /auth/magic-link/request`, independente de o email existir, do
 * rate-limit ou do provider estar configurado. A UI espelha isso —
 * mesmo erro de rede ou 4xx/5xx leva o usuário pra `/auth/magic-link/sent`
 * (apenas falha de fetch real interrompe o fluxo).
 *
 * Mensagens de erro só aparecem quando o backend faz redirect para
 * `/login?error=magic_*` depois do verify.
 *
 * Guards (CLAUDE.md):
 *  - JAMAIS revelar se o email existe (timing, mensagem ou redirect).
 *  - JAMAIS armazenar o token em localStorage — fluxo termina com cookie
 *    httpOnly emitido pelo backend.
 */

/**
 * Mapa de códigos de erro retornados pelo verify do magic link para
 * mensagens amigáveis em PT-BR. Lido em `/login?error=magic_*`.
 */
export const MAGIC_LINK_ERROR_MESSAGES: Record<string, string> = {
  magic_token_invalid: 'Link inválido ou já consumido. Solicite um novo.',
  magic_token_expired: 'Link expirado (válido por 15 minutos). Solicite um novo.',
  magic_token_used: 'Esse link já foi usado uma vez. Solicite um novo.',
  magic_request_throttled: 'Muitas solicitações recentes. Aguarde alguns minutos.',
  magic_tenant_mismatch:
    'O link foi emitido para outro espaço de trabalho. Abra no domínio correto.',
  magic_email_provider_unavailable: 'Login por email indisponível agora. Use outro método.',
  magic_callback_failed: 'Erro ao processar o link. Tente novamente.',
};

/**
 * Type guard pra códigos magic_*. Evita mapear erros não-magic e cair
 * numa mensagem genérica enganosa (errors OAuth têm prefixo `oauth_`).
 */
export function isMagicLinkError(
  code: string | null | undefined,
): code is keyof typeof MAGIC_LINK_ERROR_MESSAGES {
  return typeof code === 'string' && code in MAGIC_LINK_ERROR_MESSAGES;
}

/**
 * Mascara o email para confirmar o envio sem revelar exatamente que
 * digitou (anti-enum visual). Mantém primeiro caractere do username +
 * domínio. Username inválido (sem `@`) é devolvido como está.
 *
 * Exemplos:
 *   'joao@empresa.com'  -> 'j*****@empresa.com'
 *   'a@empresa.com'     -> 'a*****@empresa.com'
 *   'sem-arroba'        -> 'sem-arroba'
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return email;
  const username = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const firstChar = username.charAt(0);
  return `${firstChar}*****${domain}`;
}
