import type { Meta, StoryObj } from '@storybook/react';
import { Download, Plus } from 'lucide-react';

import { Button } from '../Button';

import { PageHeader } from './index';

const meta: Meta<typeof PageHeader> = {
  title: 'Compostos/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: { title: 'Clientes' },
};

export const WithBreadcrumbs: Story = {
  render: () => (
    <PageHeader
      title="Detalhes do cliente"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Clientes', href: '/clientes' },
        { label: 'Maria Silva' },
      ]}
    />
  ),
};

export const WithActions: Story = {
  render: () => (
    <PageHeader
      title="Clientes"
      actions={
        <>
          <Button variant="outline">
            <Download />
            Exportar
          </Button>
          <Button>
            <Plus />
            Novo cliente
          </Button>
        </>
      }
    />
  ),
};

export const FullExample: Story = {
  render: () => (
    <PageHeader
      title="Faturamento"
      description="Acompanhe receitas, faturas e cobrancas em um so lugar."
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Financeiro', href: '/financeiro' },
        { label: 'Faturamento' },
      ]}
      actions={
        <>
          <Button variant="outline">
            <Download />
            Exportar
          </Button>
          <Button>
            <Plus />
            Nova fatura
          </Button>
        </>
      }
    />
  ),
};

export const MobileResponsive: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => (
    <PageHeader
      title="Faturamento"
      description="Acompanhe receitas e cobrancas."
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Financeiro', href: '/financeiro' },
        { label: 'Faturamento' },
      ]}
      actions={
        <Button size="sm">
          <Plus />
          Nova fatura
        </Button>
      }
    />
  ),
};
