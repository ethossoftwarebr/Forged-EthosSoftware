import { z } from 'zod';

/**
 * UpdateTenantDto — payload do PATCH /tenants/me.
 *
 * Cobre os campos white-label do D15 (schema-ready aqui; UI completa fica
 * pra spec #18). `settings` é record livre — validação granular dos shapes
 * internos vai pro #18 quando a tela de configurações for desenhada.
 *
 * `.strict()`: rejeita keys extras (incl. `id`, `slug`, `createdAt`).
 * Slug é imutável v1 (mudar quebra subdomain routing).
 *
 * `brandColor` regex hex #rrggbb — UI lib do @ethos/ui consome ese formato.
 */
export const UpdateTenantSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    locale: z.string().min(2).max(10).optional(),
    brandColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'brandColor deve ser hex no formato #rrggbb')
      .nullable()
      .optional(),
    logoUrl: z.string().url().nullable().optional(),
    appName: z.string().min(1).max(120).nullable().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>;
