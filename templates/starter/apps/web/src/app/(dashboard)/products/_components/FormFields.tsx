// FORGE-AUTOGEN: this file is regenerated unless you delete this comment
'use client';

import type { Field } from '@ethos/ui';

/**
 * Fields gerados a partir do schema Prisma para o model Product.
 * Campos excluídos automaticamente: id, createdAt, updatedAt, tenantId.
 *
 * Mapeamento de tipos Prisma → FieldType do `@ethos/ui` FormBuilder:
 *   String                  → text
 *   Int / Float / Decimal   → number
 *   Boolean                 → checkbox
 *   DateTime                → date
 *   enum                    → select (options derivadas do enum)
 *
 * Pra customizar (helperText, placeholder, ordem), remova o header AUTOGEN
 * da primeira linha deste arquivo — o gerador passará a respeitar suas mudanças.
 */
export const productFormFields: Field[] = [
  {
    type: 'text',
    name: 'name',
    label: 'Name',
    required: true,
  },
  {
    type: 'text',
    name: 'sku',
    label: 'Sku',
    required: true,
  },
  {
    type: 'number',
    name: 'price',
    label: 'Price',
    required: true,
  },
  {
    type: 'text',
    name: 'description',
    label: 'Description',
  },
];
