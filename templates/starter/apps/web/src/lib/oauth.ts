/**
 * OAuth helpers (D8.5.1, D8.5.4, D8.5.5).
 *
 * Estratégia:
 *  - `fetchEnabledProviders()` consulta `/api/auth/providers` (W2). Se a chamada
 *    falhar (sem rede, sem providers configurados), retorna lista vazia em vez
 *    de propagar erro — UI simplesmente esconde os botões.
 *  - `oauthSignIn(provider)` navega via `window.location.href` para que o
 *    backend possa setar o cookie de state e redirecionar pro IdP. Não usamos
 *    `router.push` porque o destino é uma rota de API, não uma rota Next.js.
 *  - Tenant NÃO vai como query/body: backend lê do header X-Tenant-Slug
 *    (interceptor api-client) ou do host. O state cookie carrega tenantId
 *    no callback. Ver D8.5.1.
 *
 * Guards (CLAUDE.md):
 *  - JAMAIS embutir tenantId no link gerado client-side.
 *  - JAMAIS armazenar JWT em localStorage — fluxo OAuth termina com cookie
 *    httpOnly emitido pelo backend.
 */

import { api } from './api-client';

export interface OAuthProvider {
  name: string;
  label: string;
}

interface ProvidersResponse {
  providers: OAuthProvider[];
}

/**
 * Consulta `/api/auth/providers` e retorna a lista de providers habilitados
 * para o tenant atual. Resiliente a falhas — falha de rede vira `[]`.
 */
export async function fetchEnabledProviders(): Promise<OAuthProvider[]> {
  try {
    const { data } = await api.get<ProvidersResponse>('/auth/providers');
    return data.providers ?? [];
  } catch {
    return [];
  }
}

/**
 * Inicia o fluxo OAuth navegando para `/api/auth/{provider}`. O backend
 * monta o state cookie + redireciona pro IdP. Browser segue o 302.
 */
export function oauthSignIn(provider: string): void {
  if (typeof window === 'undefined') return;
  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  window.location.href = `${baseURL}/auth/${provider}`;
}

/**
 * Mapa de códigos de erro retornados pelo callback OAuth para mensagens
 * amigáveis em PT-BR (D8.5.5). Lido em `/login?error=...`.
 */
export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_state_invalid: 'Sessão de login inválida. Tente novamente.',
  oauth_state_expired: 'Sessão de login expirou. Tente novamente.',
  oauth_email_unverified:
    'Seu email não está verificado no provider. Confirme no Google/Microsoft e tente novamente.',
  oauth_provider_unavailable: 'Provider OAuth indisponível.',
  oauth_marketplace_required: 'Selecione um workspace para entrar.',
  oauth_callback_failed: 'Não foi possível entrar via OAuth. Tente novamente.',
};
