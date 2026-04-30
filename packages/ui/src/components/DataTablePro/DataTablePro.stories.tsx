import type { Meta, StoryObj } from '@storybook/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { StatusBadge } from '../StatusBadge';

import type { DataTableColumn, FilterOption } from './types';

import { DataTablePro } from './index';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
}

const ROLE_LABEL: Record<User['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Gerente',
  member: 'Membro',
  viewer: 'Viewer',
};

const STATUS_INTENT: Record<User['status'], 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'neutral',
};

const baseUsers: User[] = [
  { id: '1', name: 'Ana Silva', email: 'ana@ethos.dev', role: 'owner', status: 'active' },
  { id: '2', name: 'Bruno Costa', email: 'bruno@ethos.dev', role: 'admin', status: 'active' },
  { id: '3', name: 'Carla Dias', email: 'carla@ethos.dev', role: 'manager', status: 'pending' },
  { id: '4', name: 'Diego Faria', email: 'diego@ethos.dev', role: 'member', status: 'active' },
  { id: '5', name: 'Eva Gomes', email: 'eva@ethos.dev', role: 'viewer', status: 'inactive' },
  { id: '6', name: 'Felipe Hara', email: 'felipe@ethos.dev', role: 'member', status: 'active' },
  { id: '7', name: 'Gabi Iaco', email: 'gabi@ethos.dev', role: 'admin', status: 'pending' },
  { id: '8', name: 'Hugo Joaquim', email: 'hugo@ethos.dev', role: 'manager', status: 'active' },
  { id: '9', name: 'Iris Klein', email: 'iris@ethos.dev', role: 'viewer', status: 'inactive' },
  { id: '10', name: 'Joao Lemos', email: 'joao@ethos.dev', role: 'member', status: 'active' },
];

const columns: DataTableColumn<User>[] = [
  { key: 'name', label: 'Nome', sortable: true, width: '24%' },
  { key: 'email', label: 'Email', sortable: true, width: '32%' },
  {
    key: 'role',
    label: 'Funcao',
    sortable: true,
    render: (row) => ROLE_LABEL[row.role],
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => (
      <StatusBadge intent={STATUS_INTENT[row.status]}>
        {row.status === 'active' ? 'Ativo' : row.status === 'pending' ? 'Pendente' : 'Inativo'}
      </StatusBadge>
    ),
  },
];

const meta: Meta<typeof DataTablePro<User>> = {
  title: 'Compostos/DataTablePro',
  component: DataTablePro<User>,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="bg-background min-h-screen p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DataTablePro<User>>;

// ─────────────────────────────────────────────────────────────────────────────
// Basic
// ─────────────────────────────────────────────────────────────────────────────
const BasicDemo = (): JSX.Element => (
  <DataTablePro<User>
    data={baseUsers}
    columns={columns}
    onRowClick={(row) => {
      alert(`Click: ${row.name}`);
    }}
  />
);

export const Basic: Story = {
  render: () => <BasicDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// WithFilters
// ─────────────────────────────────────────────────────────────────────────────
const filterDefs: FilterOption[] = [
  {
    key: 'role',
    label: 'Funcao',
    options: [
      { value: 'owner', label: 'Owner' },
      { value: 'admin', label: 'Admin' },
      { value: 'manager', label: 'Gerente' },
      { value: 'member', label: 'Membro' },
      { value: 'viewer', label: 'Viewer' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'active', label: 'Ativo' },
      { value: 'pending', label: 'Pendente' },
      { value: 'inactive', label: 'Inativo' },
    ],
  },
];

const WithFiltersDemo = (): JSX.Element => {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string | undefined>>({});

  const filtered = useMemo(() => {
    return baseUsers.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      if (filterValues.role && u.role !== filterValues.role) return false;
      if (filterValues.status && u.status !== filterValues.status) return false;
      return true;
    });
  }, [search, filterValues]);

  return (
    <DataTablePro<User>
      data={filtered}
      columns={columns}
      search={{ placeholder: 'Buscar por nome ou email', value: search, onSearch: setSearch }}
      filters={filterDefs}
      filterValues={filterValues}
      onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
    />
  );
};

export const WithFilters: Story = {
  render: () => <WithFiltersDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// WithBulkActions
// ─────────────────────────────────────────────────────────────────────────────
const WithBulkActionsDemo = (): JSX.Element => (
  <DataTablePro<User>
    data={baseUsers}
    columns={columns}
    bulkActions={[
      { key: 'archive', label: 'Arquivar' },
      { key: 'delete', label: 'Excluir', variant: 'destructive', icon: <Trash2 /> },
    ]}
    onBulkAction={(key, rows) => {
      console.log('bulk action', key, rows);
      alert(`${key}: ${rows.length} itens`);
    }}
    rowActions={(_row) => [
      { label: 'Editar', onClick: (r) => alert(`Editar ${r.name}`), icon: <Pencil /> },
      {
        label: 'Excluir',
        onClick: (r) => alert(`Excluir ${r.name}`),
        variant: 'destructive',
        icon: <Trash2 />,
        disabled: (r) => r.role === 'owner',
      },
    ]}
  />
);

export const WithBulkActions: Story = {
  render: () => <WithBulkActionsDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading
// ─────────────────────────────────────────────────────────────────────────────
export const Loading: Story = {
  render: () => <DataTablePro<User> data={[]} columns={columns} loading />,
};

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────
export const EmptyStateStory: Story = {
  name: 'EmptyState',
  render: () => (
    <DataTablePro<User>
      data={[]}
      columns={columns}
      emptyState={{
        title: 'Nenhum cliente cadastrado',
        description: 'Comece criando seu primeiro cliente.',
      }}
    />
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// LargeDataset (1000 rows + virtualizacao implicita)
// ─────────────────────────────────────────────────────────────────────────────
const ROLES: User['role'][] = ['owner', 'admin', 'manager', 'member', 'viewer'];
const STATUSES: User['status'][] = ['active', 'pending', 'inactive'];

const largeData: User[] = Array.from({ length: 1000 }, (_, i) => ({
  id: String(i + 1),
  name: `Usuario ${i + 1}`,
  email: `user${i + 1}@ethos.dev`,
  role: ROLES[i % ROLES.length] as User['role'],
  status: STATUSES[i % STATUSES.length] as User['status'],
}));

const LargeDatasetDemo = (): JSX.Element => (
  <DataTablePro<User>
    data={largeData}
    columns={columns}
    density="compact"
    search={{ placeholder: 'Buscar...', onSearch: () => undefined }}
  />
);

export const LargeDataset: Story = {
  render: () => <LargeDatasetDemo />,
};
