import { PrismaClient } from '@prisma/client';

export type {
  Tenant,
  User,
  TenantMember,
  OAuthAccount,
  RefreshToken,
  Session,
  AuditLog,
  MfaBackupCode,
  MagicLinkToken,
  Role,
  Prisma,
} from '@prisma/client';

export { PrismaClient };

export type EthosPrismaClient = PrismaClient;

/**
 * Cria um PrismaClient singleton-friendly. NestJS injeta via providers; Next/Edge
 * pode reusar o resultado durante hot-reload de dev (cuidado com leak: only in dev).
 */
export function createPrismaClient(options?: {
  databaseUrl?: string;
  log?: ('query' | 'info' | 'warn' | 'error')[];
}): PrismaClient {
  return new PrismaClient({
    datasourceUrl: options?.databaseUrl,
    log: options?.log,
  });
}

export { withTenantExtension } from './extension/tenant';
