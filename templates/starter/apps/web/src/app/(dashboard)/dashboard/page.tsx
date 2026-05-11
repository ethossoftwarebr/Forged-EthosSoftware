'use client';

import { DataTablePro, KpiCard, StatusBadge, type DataTableColumn } from '@ethos/ui';

/**
 * Dashboard mock — 4 KpiCards + DataTablePro com 5 rows de exemplo.
 *
 * Sem chamada de API ainda: o objetivo desta wave é exercitar o app shell
 * (sidebar + topbar + breadcrumbs) e validar a integração `@ethos/ui` no web.
 */

interface Order {
  id: string;
  customer: string;
  total: string;
  status: 'paid' | 'pending' | 'cancelled';
  createdAt: string;
}

const orders: Order[] = [
  {
    id: '#1042',
    customer: 'Maria Silva',
    total: 'R$ 1.240,00',
    status: 'paid',
    createdAt: '2026-05-10T14:23:00Z',
  },
  {
    id: '#1041',
    customer: 'João Santos',
    total: 'R$ 480,00',
    status: 'pending',
    createdAt: '2026-05-10T09:11:00Z',
  },
  {
    id: '#1040',
    customer: 'Ana Costa',
    total: 'R$ 2.890,00',
    status: 'paid',
    createdAt: '2026-05-09T16:48:00Z',
  },
  {
    id: '#1039',
    customer: 'Pedro Lima',
    total: 'R$ 312,00',
    status: 'cancelled',
    createdAt: '2026-05-09T11:02:00Z',
  },
  {
    id: '#1038',
    customer: 'Carla Mendes',
    total: 'R$ 760,00',
    status: 'paid',
    createdAt: '2026-05-08T18:35:00Z',
  },
];

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const statusIntent: Record<Order['status'], 'success' | 'warning' | 'error'> = {
  paid: 'success',
  pending: 'warning',
  cancelled: 'error',
};

const statusLabel: Record<Order['status'], string> = {
  paid: 'Pago',
  pending: 'Pendente',
  cancelled: 'Cancelado',
};

const columns: DataTableColumn<Order>[] = [
  { key: 'id', label: 'Pedido', width: '100px' },
  { key: 'customer', label: 'Cliente' },
  { key: 'total', label: 'Total', align: 'right' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <StatusBadge intent={statusIntent[row.status]} dot>
        {statusLabel[row.status]}
      </StatusBadge>
    ),
  },
  {
    key: 'createdAt',
    label: 'Criado em',
    render: (row) => dateFormatter.format(new Date(row.createdAt)),
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do seu negócio</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Receita do mês"
          value="R$ 48.230"
          trend={{ value: 12.4, direction: 'up' }}
          variant="success"
        />
        <KpiCard
          label="Pedidos"
          value={184}
          trend={{ value: 8.1, direction: 'up' }}
          variant="info"
          sparkline={[4, 6, 5, 8, 7, 9, 10]}
        />
        <KpiCard
          label="Ticket médio"
          value="R$ 262"
          trend={{ value: 3.2, direction: 'down' }}
          variant="warning"
        />
        <KpiCard label="Conversão" value="2,4%" trend={{ value: 0, direction: 'neutral' }} />
      </section>

      <section>
        <h2 className="mb-4 mt-8 text-xl font-semibold">Pedidos recentes</h2>
        <DataTablePro<Order> data={orders} columns={columns} density="normal" />
      </section>
    </div>
  );
}
