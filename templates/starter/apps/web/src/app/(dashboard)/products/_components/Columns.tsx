// FORGE-AUTOGEN: this file is regenerated unless you delete this comment
'use client';

import type { DataTableColumn } from '@ethos/ui';

/**
 * Colunas geradas a partir do schema Prisma para o model Product.
 * Campos excluídos automaticamente: id, createdAt, updatedAt, tenantId.
 *
 * V1: tipo é Record<string, unknown> pois o OpenAPI atual (sem @ApiOkResponse
 * nos controllers gerados) não expõe shape do recurso. Quando backend gen
 * adicionar Swagger response types, troca pra `import type { Product }`.
 *
 * Pra customizar (cell render, sortable, width), remova o header AUTOGEN
 * da primeira linha deste arquivo — o gerador passará a respeitar suas mudanças.
 */
type ProductRow = Record<string, unknown>;

export const productColumns: DataTableColumn<ProductRow>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
  },
  {
    key: 'sku',
    label: 'Sku',
    sortable: true,
  },
  {
    key: 'price',
    label: 'Price',
    sortable: true,
  },
  {
    key: 'description',
    label: 'Description',
    sortable: true,
  },
];
