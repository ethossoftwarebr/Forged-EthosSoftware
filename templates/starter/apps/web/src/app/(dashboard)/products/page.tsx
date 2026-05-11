// FORGE-AUTOGEN: this file is regenerated unless you delete this comment
'use client';

import { Button, DataTablePro, Input } from '@ethos/ui';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { productColumns } from './_components/Columns';

import { productsControllerListOptions } from '@/generated/api/@tanstack/react-query.gen';

const PAGE_SIZE = 20;

/**
 * Página de listagem de Products.
 *
 * Estados:
 *  - paginação: page/PAGE_SIZE convertidos pra take/skip antes de bater na API.
 *  - busca: campo `search` é repassado como query param.
 *
 * Customize livremente — pra travar este arquivo contra regen, remova o
 * header AUTOGEN da primeira linha.
 */
export default function ProductsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery(
    productsControllerListOptions({
      query: {
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        search,
      },
    }),
  );
  // V1: OpenAPI atual não expõe shape da resposta — cast pra acessar
  // `items`/`total`. Quando @ApiOkResponse for adicionado no controller
  // gen, troca por tipo gerado.
  const list = (data ?? {}) as { items?: unknown[]; total?: number };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground text-sm">Gerencie Products do seu tenant.</p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="mr-2 h-4 w-4" /> Novo Product
          </Link>
        </Button>
      </header>

      <div className="max-w-sm">
        <Input
          type="search"
          placeholder="Buscar Products..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTablePro
        columns={productColumns}
        data={(list.items ?? []) as Record<string, unknown>[]}
        loading={isLoading}
        pagination={{ page, pageSize: PAGE_SIZE, total: list.total ?? 0, onPageChange: setPage }}
        emptyState={{
          title: 'Nenhum Product encontrado',
          description: search ? 'Ajuste sua busca.' : 'Comece criando o primeiro.',
        }}
      />
    </div>
  );
}
