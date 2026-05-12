// FORGE-AUTOGEN: this file is regenerated unless you delete this comment
'use client';

import type { DataTableColumn } from '@ethos/ui';

import type { ProductEntity } from '@/generated/api/types.gen';

/**
 * Colunas geradas a partir do schema Prisma para o model Product.
 * Campos excluídos automaticamente: id, createdAt, updatedAt, tenantId.
 *
 * Pra customizar (cell render, sortable, width), remova o header AUTOGEN
 * da primeira linha deste arquivo — o gerador passará a respeitar suas mudanças.
 */
export const productColumns: DataTableColumn<ProductEntity>[] = [
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
