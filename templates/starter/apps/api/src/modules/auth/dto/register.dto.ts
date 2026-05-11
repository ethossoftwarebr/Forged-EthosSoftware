import { z } from 'zod';

/**
 * RegisterDto — payload do POST /auth/register.
 *
 * Validações (D8 + D14):
 * - email RFC 5322
 * - password mínimo 12 chars (política do kit; cliente pode endurecer downstream)
 * - tenantSlug url-safe (kebab-case, alphanumeric + hyphen)
 * - tenantName opcional; default = slug se não vier
 */
export const RegisterSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(120).optional(),
  tenantSlug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'tenantSlug deve ser kebab-case alfanumérico'),
  tenantName: z.string().min(1).max(120).optional(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
