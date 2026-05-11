import { z } from 'zod';

/**
 * Refresh — não há body. O refresh token vem via cookie httpOnly (`refresh_token`),
 * o tenantSlug vem via header `X-Tenant-Slug` (decisão D6/D13.7 — endpoint sem
 * payload merece header, não body sintético).
 */
export const TenantSlugHeaderSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'X-Tenant-Slug header deve ser kebab-case alfanumérico');
