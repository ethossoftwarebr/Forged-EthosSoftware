import { z } from 'zod';

/**
 * UpdateMeDto — payload do PATCH /users/me.
 *
 * AC #9 (CLAUDE.md / spec #8): `tenantId` NUNCA pode vir do body. Por isso o
 * schema usa `.strict()`: qualquer key extra (incl. `tenantId`, `email`, `password`,
 * `roles`) gera 400 antes do controller ser invocado. O tenantId real é
 * sempre lido de `session.tenantId` do JWT decodificado.
 *
 * Locales suportados v1: pt-BR (default), en, es. Adicionar novos é breaking
 * cliente-side, então fica explícito aqui.
 */
export const UpdateMeSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    image: z.string().url().nullable().optional(),
    locale: z.enum(['pt-BR', 'en', 'es']).optional(),
  })
  .strict();

export type UpdateMeDto = z.infer<typeof UpdateMeSchema>;
