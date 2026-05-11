import { type Product } from '@ethos/database';
import { Injectable, NotFoundException } from '@nestjs/common';

import { type CreateProductDto, type UpdateProductDto } from './dto/product.dto';
import { ProductsRepository } from './products.repository';

/**
 * ProductsService — gerado pelo Forge (prompt #9).
 *
 * Modelo B (D3): este arquivo é o PONTO DE EXTENSÃO do dev.
 * `forge:gen:backend` NUNCA sobrescreve este arquivo — customize livremente.
 *
 * Padrão Forge: todo método recebe `tenantId` do controller (vem do JWT).
 * Multi-tenant é mandatory (D7); NUNCA pegue tenantId de outras fontes.
 */

export type ProductItem = Product;

export interface ListProductOptions {
  take: number;
  skip: number;
  search?: string;
}

export interface ListProductResult {
  items: ProductItem[];
  total: number;
  take: number;
  skip: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async list(tenantId: string, opts: ListProductOptions): Promise<ListProductResult> {
    const { take, skip, search } = opts;
    const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {};

    const [items, total] = await Promise.all([
      this.productsRepository.findMany(tenantId, {
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.productsRepository.count(tenantId, where),
    ]);

    return { items, total, take, skip };
  }

  async findOne(tenantId: string, id: string): Promise<ProductItem> {
    const item = await this.productsRepository.findFirst(tenantId, id);
    if (!item) {
      throw new NotFoundException({
        code: 'Product_NOT_FOUND'.toUpperCase(),
        message: 'Product não encontrado.',
      });
    }
    return item;
  }

  async create(tenantId: string, dto: CreateProductDto): Promise<ProductItem> {
    // dto vem validado pelo Zod (strict). Cast pra Prisma input — campos extras
    // já foram filtrados pelo schema. Se houver fields com tipos especiais
    // (Decimal, Json), customize aqui na hora de criar.
    return this.productsRepository.create(tenantId, dto as never);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto): Promise<ProductItem> {
    const updated = await this.productsRepository.update(tenantId, id, dto as never);
    if (!updated) {
      throw new NotFoundException({
        code: 'Product_NOT_FOUND'.toUpperCase(),
        message: 'Product não encontrado.',
      });
    }
    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const removed = await this.productsRepository.delete(tenantId, id);
    if (!removed) {
      throw new NotFoundException({
        code: 'Product_NOT_FOUND'.toUpperCase(),
        message: 'Product não encontrado.',
      });
    }
  }
}
