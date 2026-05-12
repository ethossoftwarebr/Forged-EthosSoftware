// FORGE-AUTOGEN: this file is regenerated unless you delete this comment
'use client';

import { FormBuilder } from '@ethos/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { productFormFields } from '../_components/FormFields';

import {
  productsControllerCreateMutation,
  productsControllerListQueryKey,
} from '@/generated/api/@tanstack/react-query.gen';
import type { ProductEntity } from '@/generated/api/types.gen';
import { zProductsControllerCreateBody } from '@/generated/api/zod.gen';

/**
 * Página de criação de Product.
 *
 * Schema Zod e tipo do body vêm direto do OpenAPI (zod.gen + types.gen).
 * Ao sucesso, invalida a query da lista via prefix do queryKey gerado pelo
 * hey-api (matching por `_id` — invalida todas as paginações/buscas) e
 * redireciona pra página de detalhes do recurso.
 *
 * Customize livremente — pra travar este arquivo contra regen, remova o
 * header AUTOGEN da primeira linha.
 */
export default function ProductCreatePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const create = useMutation(productsControllerCreateMutation());

  // Extrai o `_id` do queryKey gerado pelo hey-api — usado como prefixo
  // pra invalidar todas as queries de listagem (qualquer combinação de paginação/busca).
  const listKeyId = productsControllerListQueryKey({
    query: { take: 0, skip: 0, search: '' },
  })[0]._id;

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Novo Product</h1>
        <p className="text-muted-foreground text-sm">
          Preencha os campos abaixo para criar um Product.
        </p>
      </header>

      <FormBuilder
        schema={zProductsControllerCreateBody}
        fields={productFormFields}
        onSubmit={async (values) => {
          try {
            const created = (await create.mutateAsync({
              body: values,
            })) as ProductEntity | undefined;
            await qc.invalidateQueries({ queryKey: [{ _id: listKeyId }] });
            toast.success('Product criado com sucesso.');
            router.push(created?.id ? `/products/${created.id}` : '/products');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao criar Product.');
          }
        }}
        onCancel={() => router.push('/products')}
        submitLabel="Criar"
      />
    </div>
  );
}
