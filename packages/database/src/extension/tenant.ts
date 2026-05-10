import { Prisma } from '@prisma/client';

/**
 * Models que carregam tenantId direto. Operações sobre eles são auto-filtradas
 * pelo tenant atual (D6 cross-tenant 404). Models sem tenantId direto (User,
 * OAuthAccount, MfaBackupCode) são acessados via TenantMember/User join.
 */
const TENANT_SCOPED_MODELS = new Set([
  'TenantMember',
  'RefreshToken',
  'Session',
  'AuditLog',
  'MagicLinkToken',
]);

/**
 * Prisma extension que automaticamente filtra queries por `tenantId` lido de um
 * provider externo (geralmente AsyncLocalStorage no @ethos/api-base).
 *
 * Contrato:
 * - Se `getTenantId()` retorna string → injeta `where: { tenantId }`
 * - Se retorna null → comportamento sem filtro (uso explícito tipo seed/admin)
 *
 * Princípio: o tenantId NUNCA pode vir do request body/query (CLAUDE.md).
 * Esta extension trava esse contrato no nível do data access.
 */
export function withTenantExtension(getTenantId: () => string | null) {
  return Prisma.defineExtension({
    name: 'ethos-tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const tenantId = getTenantId();
          if (tenantId === null) {
            return query(args);
          }

          // Reading args/data via 'unknown' bypass — Prisma's $allOperations
          // hands a union of every model+operation arg shape, which can't be
          // narrowed sanely. We mutate the same object the runtime executes.
          const mutable = (args ?? {}) as Record<string, unknown>;

          if (
            [
              'findFirst',
              'findFirstOrThrow',
              'findMany',
              'findUnique',
              'findUniqueOrThrow',
              'updateMany',
              'deleteMany',
              'count',
              'aggregate',
              'groupBy',
              'update',
              'delete',
            ].includes(operation)
          ) {
            const where = (mutable.where as Record<string, unknown> | undefined) ?? {};
            mutable.where = { ...where, tenantId };
          } else if (operation === 'create') {
            const data = (mutable.data as Record<string, unknown> | undefined) ?? {};
            if (data.tenantId === undefined) {
              mutable.data = { tenantId, ...data };
            }
          } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
            const data = mutable.data;
            if (Array.isArray(data)) {
              mutable.data = data.map((d) => ({ tenantId, ...(d as Record<string, unknown>) }));
            } else if (data) {
              mutable.data = { tenantId, ...(data as Record<string, unknown>) };
            }
          } else if (operation === 'upsert') {
            const where = (mutable.where as Record<string, unknown> | undefined) ?? {};
            mutable.where = { ...where, tenantId };
            const create = (mutable.create as Record<string, unknown> | undefined) ?? {};
            mutable.create = { tenantId, ...create };
          }

          return query(mutable as Parameters<typeof query>[0]);
        },
      },
    },
  });
}
