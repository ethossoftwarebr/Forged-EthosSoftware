import { PRISMA_CLIENT_TOKEN } from '@ethos/api-base';
import { type Prisma, type PrismaClient } from '@ethos/database';
import { Inject, Injectable } from '@nestjs/common';

/**
 * ProductsRepository — gerado pelo Forge (prompt #9).
 *
 * Wrapper sobre `prisma.product` com filtro automático por `tenantId`.
 * Regenerado a cada `forge:gen:backend` — NÃO customizar aqui.
 * Para customizar queries, faça override no service (products.service.ts).
 *
 * Pattern de safety multi-tenant (D7): `updateMany`/`deleteMany` com
 * `where: { id, tenantId }` em vez de `update`/`delete` por id puro.
 * Isso garante 0 linhas afetadas em cross-tenant attempts (sem 500/leak).
 */
@Injectable()
export class ProductsRepository {
  constructor(@Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient) {}

  findMany(
    tenantId: string,
    args: Omit<Prisma.ProductFindManyArgs, 'where'> & { where?: Prisma.ProductWhereInput } = {},
  ) {
    return this.prisma.product.findMany({
      ...args,
      where: { ...args.where, tenantId },
    });
  }

  count(tenantId: string, where: Prisma.ProductWhereInput = {}) {
    return this.prisma.product.count({ where: { ...where, tenantId } });
  }

  findFirst(tenantId: string, id: string) {
    return this.prisma.product.findFirst({ where: { id, tenantId } });
  }

  create(tenantId: string, data: Omit<Prisma.ProductCreateInput, 'tenantId'>) {
    return this.prisma.product.create({
      data: { ...(data as Prisma.ProductCreateInput), tenantId },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ProductUpdateInput) {
    const result = await this.prisma.product.updateMany({
      where: { id, tenantId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.product.findUnique({ where: { id } });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.prisma.product.deleteMany({ where: { id, tenantId } });
    return result.count > 0;
  }
}
