// FORGE-AUTOGEN: this file is regenerated unless you delete this comment
'use client';

import { FormBuilder } from '@ethos/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';

import { productFormFields } from '../_components/FormFields';

import { productsControllerCreateMutation } from '@/generated/api/@tanstack/react-query.gen';

// V1: schema permissivo — OpenAPI atual não expõe body shape (controller usa
// @ZodBody, Swagger não captura). Quando backend gen adicionar @ApiBody no
// template, troca por `zproductsControllerCreateBody` do zod.gen.
const createProductSchema = z.object({}).passthrough();

/**
 * Página de criação de Product.
 *
 * Validação client = schema Zod derivado do OpenAPI (D5). Ao sucesso,
 * invalida a query da lista e redireciona pra a página de detalhes do recurso.
 *
 * Customize livremente — pra travar este arquivo contra regen, remova o
 * header AUTOGEN da primeira linha.
 */
export default function ProductCreatePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const create = useMutation(productsControllerCreateMutation());

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Novo Product</h1>
        <p className="text-muted-foreground text-sm">
          Preencha os campos abaixo para criar um Product.
        </p>
      </header>

      <FormBuilder
        schema={createProductSchema}
        fields={productFormFields}
        onSubmit={async (values) => {
          try {
            // V1: cast — OpenAPI atual não expõe body schema (controller usa
            // @ZodBody, NestJS Swagger não captura). Cast pra unknown e depois
            // pra forma esperada pelo mutation (que aceita Options<Data> — body
            // inferido como never). Quando backend adicionar @ApiBody no template
            // do forge-controller, troca isso pelo schema/type gerado.
            const created = (await create.mutateAsync({ body: values } as never)) as
              | { id?: string }
              | undefined;
            await qc.invalidateQueries({
              predicate: (q) => {
                const k = q.queryKey?.[0];
                return (
                  typeof k === 'object' &&
                  k !== null &&
                  (k as { _id?: string })._id === 'productsControllerList'
                );
              },
            });
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
