import type { Meta, StoryObj } from '@storybook/react';
import { AlertCircle, FileQuestion, Inbox, Search, Users } from 'lucide-react';

import { EmptyState } from './index';

const meta: Meta<typeof EmptyState> = {
  title: 'Compostos/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Empty: Story = {
  render: () => (
    <div className="w-[640px] rounded-md border border-dashed">
      <EmptyState
        variant="empty"
        icon={<Inbox />}
        title="Nenhum cliente cadastrado"
        description="Adicione seu primeiro cliente para comecar a usar o sistema."
        primaryAction={{
          label: 'Adicionar cliente',
          onClick: () => alert('open create modal'),
        }}
      />
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div className="w-[640px] rounded-md border border-dashed">
      <EmptyState
        variant="error"
        icon={<AlertCircle />}
        title="Erro ao carregar dados"
        description="Nao conseguimos buscar a lista de clientes. Tente novamente em instantes."
        primaryAction={{
          label: 'Tentar de novo',
          onClick: () => alert('refetch'),
        }}
      />
    </div>
  ),
};

export const SearchNoResults: Story = {
  render: () => (
    <div className="w-[640px] rounded-md border border-dashed">
      <EmptyState
        variant="search-no-results"
        icon={<Search />}
        title="Nenhum resultado encontrado"
        description='Nao encontramos clientes com "Maria Souza". Tente outro termo.'
        secondaryAction={{
          label: 'Limpar busca',
          onClick: () => alert('clear search'),
        }}
      />
    </div>
  ),
};

export const WithBothActions: Story = {
  render: () => (
    <div className="w-[640px] rounded-md border border-dashed">
      <EmptyState
        variant="empty"
        icon={<Users />}
        title="Sua equipe esta vazia"
        description="Convide colegas ou importe sua lista para comecar a colaborar."
        primaryAction={{
          label: 'Convidar membro',
          onClick: () => alert('invite'),
        }}
        secondaryAction={{
          label: 'Importar CSV',
          onClick: () => alert('import'),
        }}
      />
    </div>
  ),
};

export const Custom: Story = {
  render: () => (
    <div className="w-[640px] rounded-md border border-dashed">
      <EmptyState
        icon={<FileQuestion />}
        title="Documentacao em construcao"
        description="Esta secao ainda nao tem conteudo. Volte em breve."
      />
    </div>
  ),
};
