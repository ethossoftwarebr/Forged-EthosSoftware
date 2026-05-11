// FORGE-AUTOGEN: this file is regenerated unless you delete this comment
'use client';

import { FormBuilder, Skeleton } from '@ethos/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';

import { productFormFields } from '../../_components/FormFields';

import {
  productsControllerFindOneOptions,
  productsControllerFindOneQueryKey,
  productsControllerUpdateMutation,
} from '@/generated/api/@tanstack/react-query.gen';

// V1: schema permissivo — ver create.hbs.
const updateProductSchema = z.object({}).passthrough();

/**
 * Página de edição de um Product pelo id.
 *
 * Pré-popula o formulário via `useQuery` no findOne; ao submit, dispara a
 * mutation de update + invalida queries da lista e do recurso. Validação
 * via schema Zod parcial gerado pelo OpenAPI.
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

  if (isLoading || !data) {
    return (
      <div className="max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Editar Product</h1>
        <p className="text-muted-foreground text-sm">
          Atualize os campos abaixo. Campos não preenchidos permanecem inalterados.
        </p>
      </header>

      <FormBuilder
        schema={updateProductSchema}
        fields={productFormFields}
        defaultValues={data as never}
        onSubmit={async (values) => {
          try {
            // V1: cast body/return — OpenAPI atual sem @ApiBody/@ApiOkResponse.
            await update.mutateAsync({ path: { id }, body: values } as never);
            await Promise.all([
              qc.invalidateQueries({
                queryKey: productsControllerFindOneQueryKey({ path: { id } }),
              }),
              qc.invalidateQueries({
                predicate: (q) => {
                  const k = q.queryKey?.[0];
                  return (
                    typeof k === 'object' &&
                    k !== null &&
                    (k as { _id?: string })._id === 'productsControllerList'
                  );
                },
              }),
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
