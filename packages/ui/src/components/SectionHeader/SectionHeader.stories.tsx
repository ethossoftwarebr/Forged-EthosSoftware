import type { Meta, StoryObj } from '@storybook/react';
import { Plus, Settings } from 'lucide-react';

import { Button } from '../Button';
import { Card, CardContent } from '../Card';

import { SectionHeader } from './index';

const meta: Meta<typeof SectionHeader> = {
  title: 'Compostos/SectionHeader',
  component: SectionHeader,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof SectionHeader>;

export const Default: Story = {
  args: { title: 'Clientes' },
  render: (args) => (
    <div className="w-[640px]">
      <SectionHeader {...args} />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="w-[640px]">
      <SectionHeader
        title="Clientes ativos"
        description="Lista de clientes com status ativo no sistema."
      />
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <div className="w-[640px]">
      <SectionHeader
        title="Clientes"
        description="Gerencie sua base de clientes."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Settings />
              Configurar
            </Button>
            <Button size="sm">
              <Plus />
              Novo cliente
            </Button>
          </>
        }
      />
    </div>
  ),
};

export const Compact: Story = {
  render: () => (
    <div className="w-[640px]">
      <SectionHeader
        title="Configuracoes gerais"
        actions={
          <Button size="sm" variant="ghost">
            Ver tudo
          </Button>
        }
      />
    </div>
  ),
};

export const InCard: Story = {
  render: () => (
    <Card className="w-[640px]">
      <CardContent className="pt-6">
        <SectionHeader
          title="Atividade recente"
          description="Ultimas 24 horas."
          actions={
            <Button variant="ghost" size="sm">
              Atualizar
            </Button>
          }
        />
        <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
          Conteudo da secao
        </div>
      </CardContent>
    </Card>
  ),
};
