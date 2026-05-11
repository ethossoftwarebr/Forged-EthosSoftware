// FORGE-AUTOGEN: this file is regenerated unless you delete this comment
'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@ethos/ui';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { productsControllerFindOneOptions } from '@/generated/api/@tanstack/react-query.gen';

/**
 * Página de detalhes (read-only) de um Product pelo id.
 *
 * Customize livremente — pra travar este arquivo contra regen, remova o
 * header AUTOGEN da primeira linha.
 */
export default function ProductViewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const {
    data: raw,
    isLoading,
    error,
  } = useQuery(productsControllerFindOneOptions({ path: { id } }));
  // V1: cast — OpenAPI atual não expõe shape do recurso (sem @ApiOkResponse
  // no controller gen). Quando backend adicionar, troca por tipo gerado.
  const data = (raw ?? null) as Record<string, unknown> | null;

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-destructive text-sm">
          Product não encontrado.{' '}
          <Link href="/products" className="underline">
            Voltar para a lista
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{String(data.name)}</h1>
          <p className="text-muted-foreground text-sm">Detalhes do Product.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/products/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground font-medium">Name</dt>
              <dd className="mt-1">{data.name != null ? String(data.name) : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Sku</dt>
              <dd className="mt-1">{data.sku != null ? String(data.sku) : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Price</dt>
              <dd className="mt-1">{data.price != null ? String(data.price) : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Description</dt>
              <dd className="mt-1">{data.description != null ? String(data.description) : '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
