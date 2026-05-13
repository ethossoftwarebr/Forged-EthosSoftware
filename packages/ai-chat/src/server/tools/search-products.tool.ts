import { getCurrentTenantId } from '@ethos/api-base';
import type { PrismaClient } from '@ethos/database';
import { z } from 'zod';

import type { ToolDef } from '../../shared';

export interface SearchProductsResult {
  id: string;
  name: string;
  sku: string;
  price: number;
}

interface SearchProductsInput {
  query: string;
  limit: number;
}

const searchProductsInput = z.object({
  query: z.string().min(1).describe('Termo de busca (case-insensitive em nome).'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Máximo de resultados (1-50). Default: 10.'),
}) as unknown as z.ZodType<SearchProductsInput>;

/**
 * Factory pra `searchProducts` tool. Devs criam a tool com:
 * ```ts
 * AiChatModule.forRoot({
 *   apiKey,
 *   tools: [createSearchProductsTool(prisma)],
 * })
 * ```
 *
 * Multi-tenant: `getCurrentTenantId()` (api-base AsyncLocalStorage) garante que
 * só produtos do tenant atual são retornados. Tools executam DENTRO do request
 * context (CLAUDE.md princípio 3).
 *
 * Schema-ready: depende de `Product` em `packages/database` (já existe).
 */
export function createSearchProductsTool(
  prisma: PrismaClient,
): ToolDef<SearchProductsInput, SearchProductsResult[]> {
  return {
    name: 'search_products',
    description:
      'Busca produtos do tenant atual por termo (match case-insensitive em nome). Retorna até `limit` resultados.',
    inputSchema: searchProductsInput,
    handler: async ({ query, limit }) => {
      const tenantId = getCurrentTenantId();
      if (!tenantId) {
        throw new Error('No tenant context — tool must run inside an authenticated request.');
      }
      const products = await prisma.product.findMany({
        where: {
          tenantId,
          name: { contains: query, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, name: true, sku: true, price: true },
      });
      return products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        // Prisma Decimal → number via toString (V1: assume valores dentro
        // do safe range; precisão fina é responsabilidade do dev consumidor).
        price: Number(p.price.toString()),
      }));
    },
  };
}
