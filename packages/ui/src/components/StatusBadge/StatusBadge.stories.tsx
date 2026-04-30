import type { Meta, StoryObj } from '@storybook/react';

import { Badge } from '../Badge';

import { StatusBadge } from './index';

const meta: Meta<typeof StatusBadge> = {
  title: 'Compostos/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { children: 'Status' },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge intent="success">Ativo</StatusBadge>
      <StatusBadge intent="warning">Pendente</StatusBadge>
      <StatusBadge intent="error">Falhou</StatusBadge>
      <StatusBadge intent="info">Em revisao</StatusBadge>
      <StatusBadge intent="neutral">Rascunho</StatusBadge>
    </div>
  ),
};

export const WithDot: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <StatusBadge intent="success" dot>
          Ativo
        </StatusBadge>
        <StatusBadge intent="warning" dot>
          Aguardando
        </StatusBadge>
        <StatusBadge intent="error" dot>
          Inativo
        </StatusBadge>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge intent="success">Ativo</StatusBadge>
        <StatusBadge intent="warning">Aguardando</StatusBadge>
        <StatusBadge intent="error">Inativo</StatusBadge>
      </div>
    </div>
  ),
};

export const DotOnly: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <StatusBadge intent="success" dot aria-label="Online">
        <span className="sr-only">Online</span>
      </StatusBadge>
      <StatusBadge intent="warning" dot aria-label="Idle">
        <span className="sr-only">Idle</span>
      </StatusBadge>
      <StatusBadge intent="error" dot aria-label="Offline">
        <span className="sr-only">Offline</span>
      </StatusBadge>
    </div>
  ),
};

export const InTable: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <table className="w-[420px] border-collapse text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-2 font-medium">Cliente</th>
          <th className="py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="py-2">Maria Silva</td>
          <td className="py-2">
            <StatusBadge intent="success" dot>
              Ativo
            </StatusBadge>
          </td>
        </tr>
        <tr className="border-b">
          <td className="py-2">Joao Pereira</td>
          <td className="py-2">
            <StatusBadge intent="warning" dot>
              Pendente
            </StatusBadge>
          </td>
        </tr>
        <tr>
          <td className="py-2">Ana Costa</td>
          <td className="py-2">
            <StatusBadge intent="error" dot>
              Bloqueado
            </StatusBadge>
          </td>
        </tr>
      </tbody>
    </table>
  ),
};

export const AlongsideBadge: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge variant="default">Plano Pro</Badge>
      <StatusBadge intent="success" dot>
        Ativo
      </StatusBadge>
      <Badge variant="outline">v2.4</Badge>
    </div>
  ),
};
