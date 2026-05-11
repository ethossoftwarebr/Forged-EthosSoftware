import { z } from 'zod';

/**
 * Product DTOs — gerados pelo Forge (prompt #9).
 *
 * Schemas Zod strict (.strict()) — chaves extras rejeitadas com 400 (D7).
 * `tenantId` NUNCA aceito no body (vem do JWT via @CurrentUser).
 *
 * TODO(forge): em V2 esses fields serão gerados a partir do schema.prisma —
 * por enquanto, ajuste manualmente conforme campos do model.
 */

export const CreateProductSchema = z
  .object({
    name: z.string().min(1, 'name é obrigatório'),
    sku: z.string().min(1, 'sku é obrigatório'),
    price: z.coerce.number().nonnegative('price deve ser >= 0'),
    description: z.string().optional(),
  })
  .strict();
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial().strict();
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
