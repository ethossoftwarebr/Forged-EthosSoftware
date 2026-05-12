/**
 * Runtime config para o client `@hey-api/client-axios`.
 *
 * Hey-api lê este arquivo via `runtimeConfigPath` em `openapi-ts.config.ts` e
 * chama `createClientConfig()` na inicialização do client gerado em
 * `src/generated/api/client/client.gen.ts`. Resultado: TODA requisição feita
 * pelos SDKs / hooks gerados (`useQuery(productsControllerListOptions({...}))`,
 * `productsControllerCreate(...)`, etc.) passa pela mesma instância axios
 * canônica do app (`@/lib/api-client`) — herdando:
 *
 *  - `withCredentials: true` (cookie httpOnly carrega JWT — D7)
 *  - request interceptor injetando `X-Tenant-Slug` no header
 *  - response interceptor com refresh-on-401 race-safe (mutex + queue)
 *
 * Por que `runtimeConfigPath` em vez de `client.setConfig({ axios })`?
 * O config é aplicado ANTES do primeiro uso do client — `setConfig` corre
 * o risco de chegar tarde se algum hook/SSR disparar antes do bootstrap.
 * Recomendação oficial do hey-api para Next.js.
 *
 * Guards (CLAUDE.md):
 *  - JWT JAMAIS em localStorage — só cookie httpOnly (via `withCredentials`)
 *  - `X-Tenant-Slug` SEMPRE header (NUNCA body/query — axios interceptor garante)
 */

import type { CreateClientConfig } from '@/generated/api/client.gen';
import { api } from '@/lib/api-client';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: api,
  baseURL: api.defaults.baseURL,
});
