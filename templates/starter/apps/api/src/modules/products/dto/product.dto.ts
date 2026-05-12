import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * Product DTOs — gerados pelo Forge (prompt #9 + #11.5).
 *
 * Dupla expressão (D7 — single source of edit fica neste template .hbs):
 *  - **Zod schemas** (strict — chaves extras rejeitam com 400) são a fonte de
 *    verdade da validation em runtime. Usadas via `@ZodBody(Schema)`.
 *  - **Classes paralelas com @ApiProperty** existem APENAS pra introspection
 *    do `@nestjs/swagger`. Sem class-validator (validação já é Zod).
 *
 * `tenantId` NUNCA aparece nas classes Create/Update — vem do JWT (CLAUDE.md).
 */

// ============================================================================
// CreateProduct
// ============================================================================

export const CreateProductSchema = z
  .object({
    name: z.string().min(1, 'name é obrigatório'),
    sku: z.string().min(1, 'sku é obrigatório'),
    price: z.coerce.number(),
    description: z.string().optional(),
  })
  .strict();
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

/**
 * Classe espelho do CreateProductSchema — usada SÓ pra OpenAPI via
 * `@ApiBody({ type: CreateProductDtoClass })`. Não usar em runtime.
 */
export class CreateProductDtoClass {
  @ApiProperty({ type: String, required: true })
  name!: string;

  @ApiProperty({ type: String, required: true })
  sku!: string;

  @ApiProperty({ type: Number, required: true })
  price!: number;

  @ApiProperty({ type: String, required: false })
  description?: string;
}

// ============================================================================
// UpdateProduct — todos os fields opcionais (PATCH semantics)
// ============================================================================

export const UpdateProductSchema = CreateProductSchema.partial().strict();
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;

export class UpdateProductDtoClass {
  @ApiProperty({ type: String, required: false })
  name?: string;

  @ApiProperty({ type: String, required: false })
  sku?: string;

  @ApiProperty({ type: Number, required: false })
  price?: number;

  @ApiProperty({ type: String, required: false })
  description?: string;
}

// ============================================================================
// ProductEntity — shape de response (usado em @ApiOkResponse/@ApiCreatedResponse)
// `tenantId` NÃO é exposto na entity (D7 — não vaza contexto multi-tenant).
// ============================================================================

export class ProductEntity {
  @ApiProperty({ type: String, required: true })
  id!: string;

  @ApiProperty({ type: String, required: true })
  name!: string;

  @ApiProperty({ type: String, required: true })
  sku!: string;

  @ApiProperty({ type: Number, required: true })
  price!: number;

  @ApiProperty({ type: String, required: false })
  description?: string;

  @ApiProperty({ type: Date, required: true })
  createdAt!: Date;

  @ApiProperty({ type: Date, required: true })
  updatedAt!: Date;
}

// ============================================================================
// PaginatedProductResponse — wrapper de listagem (GET /products).
// W4 (#11.5): classe concreta (sem $ref) — hey-api codegen funciona melhor com
// resposta concreta `{ items, total, take, skip }` do que com generic wrapper.
// Service retorna `ListProductResult`; este é o shape exposto via OpenAPI.
// ============================================================================

export class PaginatedProductResponse {
  @ApiProperty({ type: [ProductEntity], description: 'Items da página' })
  items!: ProductEntity[];

  @ApiProperty({ type: Number, description: 'Total de itens (sem paginação)' })
  total!: number;

  @ApiProperty({ type: Number })
  take!: number;

  @ApiProperty({ type: Number })
  skip!: number;
}
