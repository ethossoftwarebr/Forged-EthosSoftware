import { z } from 'zod';

/**
 * LoginDto — payload do POST /auth/login.
 *
 * tenantSlug é obrigatório no body — o usuário sempre escolhe em qual tenant
 * está autenticando (mesmo email pode ser membro de N tenants).
 */
export const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
  tenantSlug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'tenantSlug deve ser kebab-case alfanumérico'),
});

export type LoginDto = z.infer<typeof LoginSchema>;
