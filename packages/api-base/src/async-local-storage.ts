import { AsyncLocalStorage } from 'node:async_hooks';

import type { AuthSession } from '@ethos/auth';

/**
 * TenantContext (D4) — armazenamento por-request do `tenantId` + `userId` +
 * `roles` extraídos do JWT decodificado. Acessível em qualquer ponto do call
 * stack sem prop drilling.
 *
 * Princípio (CLAUDE.md): tenantId NUNCA pode vir do request body/query.
 * O JwtAuthGuard lê do JWT decodificado e popula este store.
 *
 * Uso:
 *   const tenantId = TenantContext.getTenantId();
 *   const session = TenantContext.getSession();
 */

export interface TenantContextData {
  session: AuthSession;
  ip?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<TenantContextData>();

export const TenantContext = {
  /**
   * Roda `fn` dentro do contexto de um tenant. Geralmente chamado pelo
   * `MultiTenantInterceptor` no início de cada request.
   */
  run<T>(data: TenantContextData, fn: () => T): T {
    return storage.run(data, fn);
  },

  /** Retorna o store atual ou null se chamado fora de request. */
  get(): TenantContextData | null {
    return storage.getStore() ?? null;
  },

  getSession(): AuthSession | null {
    return storage.getStore()?.session ?? null;
  },

  getTenantId(): string | null {
    return storage.getStore()?.session.tenantId ?? null;
  },

  getUserId(): string | null {
    return storage.getStore()?.session.userId ?? null;
  },

  getRoles(): AuthSession['roles'] {
    return storage.getStore()?.session.roles ?? [];
  },
};

/**
 * Provider de tenantId pra `withTenantExtension` do `@ethos/database`.
 * Usar via:
 *   prisma.$extends(withTenantExtension(getCurrentTenantId))
 */
export const getCurrentTenantId = (): string | null => TenantContext.getTenantId();
