import type { Meta, StoryObj } from '@storybook/react';
import { Activity, DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';

import { KpiCard } from './index';

const meta: Meta<typeof KpiCard> = {
  title: 'Compostos/KpiCard',
  component: KpiCard,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof KpiCard>;

export const Default: Story = {
  render: () => (
    <div className="w-[280px]">
      <KpiCard label="Receita total" value="R$ 142.380" description="Acumulado no mes" />
    </div>
  ),
};

export const WithTrendUp: Story = {
  render: () => (
    <div className="w-[280px]">
      <KpiCard
        label="Receita total"
        value="R$ 142.380"
        icon={<DollarSign />}
        trend={{ value: 12.4, direction: 'up', label: 'vs mes anterior' }}
      />
    </div>
  ),
};

export const WithTrendDown: Story = {
  render: () => (
    <div className="w-[280px]">
      <KpiCard
        label="Taxa de conversao"
        value="3.8%"
        icon={<Activity />}
        trend={{ value: -3.2, direction: 'down', label: 'vs mes anterior' }}
      />
    </div>
  ),
};

export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      <KpiCard
        variant="default"
        label="Usuarios"
        value="1.284"
        icon={<Users />}
        trend={{ value: 5.1, direction: 'up' }}
      />
      <KpiCard
        variant="success"
        label="Pedidos pagos"
        value="847"
        icon={<ShoppingCart />}
        trend={{ value: 8.3, direction: 'up' }}
      />
      <KpiCard
        variant="warning"
        label="Em revisao"
        value="23"
        icon={<Activity />}
        trend={{ value: 0, direction: 'neutral', label: 'estavel' }}
      />
      <KpiCard
        variant="destructive"
        label="Falhas"
        value="12"
        icon={<TrendingUp />}
        trend={{ value: -2.1, direction: 'down' }}
      />
      <KpiCard
        variant="info"
        label="Tickets abertos"
        value="56"
        icon={<Activity />}
        trend={{ value: 1.8, direction: 'up' }}
      />
    </div>
  ),
};

export const WithSparkline: Story = {
  render: () => (
    <div className="w-[280px]">
      <KpiCard
        label="MRR"
        value="R$ 28.940"
        icon={<TrendingUp />}
        trend={{ value: 4.2, direction: 'up' }}
        sparkline={[10, 15, 13, 18, 22, 20, 25]}
      />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="w-[280px]">
      <KpiCard
        label="Receita total"
        value="R$ 142.380"
        icon={<DollarSign />}
        trend={{ value: 12.4, direction: 'up' }}
        loading
      />
    </div>
  ),
};
