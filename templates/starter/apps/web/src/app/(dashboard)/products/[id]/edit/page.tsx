// FORGE-AUTOGEN: this file is regenerated unless you delete this comment
'use client';

import { FormBuilder, Skeleton } from '@ethos/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { productFormFields } from '../../_components/FormFields';

import {
  productsControllerFindOneOptions,
  productsControllerFindOneQueryKey,
  productsControllerListQueryKey,
  productsControllerUpdateMutation,
} from '@/generated/api/@tanstack/react-query.gen';
import type { ProductEntity } from '@/generated/api/types.gen';
import { zProductsControllerUpdateBody } from '@/generated/api/zod.gen';

/**
 * Página de edição de um Product pelo id.
 *
 * Pré-popula o formulário via `useQuery` no findOne; ao submit, dispara a
 * mutation de update + invalida queries da lista (via prefix `_id`) e do
 * recurso (queryKey exato). Schema Zod do PATCH vem do zod.gen do OpenAPI.
 *
 * Customize livremente — pra travar este arquivo contra regen, remova o
 * header AUTOGEN da primeira linha.
 */
export default function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery(productsControllerFindOneOptions({ path: { id } }));
  const update = useMutation(productsControllerUpdateMutation());

  // Prefixo do queryKey de listagem — invalida qualquer paginação/busca.
  const listKeyId = productsControllerListQueryKey({
    query: { take: 0, skip: 0, search: '' },
  })[0]._id;

  if (isLoading || !data) {
    return (
      <div className="max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const item = data as ProductEntity;

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Editar Product</h1>
        <p className="text-muted-foreground text-sm">
          Atualize os campos abaixo. Campos não preenchidos permanecem inalterados.
        </p>
      </header>

      <FormBuilder
        schema={zProductsControllerUpdateBody}
        fields={productFormFields}
        defaultValues={item}
        onSubmit={async (values) => {
          try {
            await update.mutateAsync({ path: { id }, body: values });
            await Promise.all([
              qc.invalidateQueries({
                queryKey: productsControllerFindOneQueryKey({ path: { id } }),
              }),
              qc.invalidateQueries({ queryKey: [{ _id: listKeyId }] }),
            ]);
            toast.success('Product atualizado.');
            router.push(`/products/${id}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao atualizar Product.');
          }
        }}
        onCancel={() => router.push(`/products/${id}`)}
        submitLabel="Salvar"
      />
    </div>
  );
}
