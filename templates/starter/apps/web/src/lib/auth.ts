/**
 * Helpers de resolução de tenant pelo host (subdomain-based).
 *
 * Estratégia:
 *  - Produção: `acme.app.com` → `acme`. Primeiro subdomain (label antes do
 *    root domain) é o tenant slug.
 *  - Dev (`localhost`, `127.0.0.1`, IPs): usa `NEXT_PUBLIC_DEFAULT_TENANT`.
 *  - SSR/Node sem hostname: usa `NEXT_PUBLIC_DEFAULT_TENANT`.
 *
 * Sem side-effects: nada de `window.*` no top-level. Resolvido on-demand
 * pelo axios request interceptor (api-client.ts).
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/**
 * Considera produção qualquer host que NÃO seja localhost/IP/vazio.
 * Heurística simples — refinar via env flag explícito se preciso.
 */
export function isProductionHost(hostname: string): boolean {
  if (!hostname) return false;
  if (LOCAL_HOSTNAMES.has(hostname)) return false;
  // IPs literais (v4 simples + v6 com `:`) — não tentamos extrair subdomain.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  if (hostname.includes(':') && !hostname.includes('.')) return false;
  // Precisa ter pelo menos um ponto pra ter subdomain.
  return hostname.includes('.');
}

/**
 * Extrai o tenant slug do hostname (primeiro label).
 * Fallback: `NEXT_PUBLIC_DEFAULT_TENANT` (env público — safe no client).
 *
 * `hostname` opcional pra permitir SSR/test sem `window`.
 */
export function tenantFromHost(hostname?: string): string {
  const fallback = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? '';

  // Browser: usa window.location.hostname se não veio explícito.
  const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');

  if (!host || !isProductionHost(host)) {
    return fallback;
  }

  const firstLabel = host.split('.')[0] ?? '';
  return firstLabel || fallback;
}
