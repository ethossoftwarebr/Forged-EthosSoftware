import type { Meta, StoryObj } from '@storybook/react';
import {
  FileText,
  Home,
  LifeBuoy,
  Receipt,
  Settings,
  ShoppingCart,
  UploadCloud,
  Users,
} from 'lucide-react';

import { KpiCard } from '../../components/KpiCard';

import { defineSidebarConfig } from './sidebarConfig';

import { DashboardLayout } from './index';

const meta: Meta<typeof DashboardLayout> = {
  title: 'Layouts/DashboardLayout',
  component: DashboardLayout,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof DashboardLayout>;

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────
const EthosWordmark = () => (
  <div className="text-foreground text-lg font-bold tracking-tight">E</div>
);

const mockConfig = defineSidebarConfig([
  { key: 'inicio', label: 'Inicio', icon: <Home />, href: '/' },
  {
    key: 'clientes',
    label: 'Clientes',
    icon: <Users />,
    children: [
      { key: 'clientes-lista', label: 'Lista', href: '/clientes' },
      {
        key: 'clientes-importar',
        label: 'Importar',
        icon: <UploadCloud />,
        href: '/clientes/importar',
      },
    ],
  },
  {
    key: 'vendas',
    label: 'Vendas',
    icon: <ShoppingCart />,
    badge: 3,
    children: [
      { key: 'vendas-pedidos', label: 'Pedidos', href: '/vendas/pedidos' },
      { key: 'vendas-faturas', label: 'Faturas', icon: <Receipt />, href: '/vendas/faturas' },
      {
        key: 'vendas-relatorios',
        label: 'Relatorios',
        icon: <FileText />,
        href: '/vendas/relatorios',
      },
    ],
  },
  { key: 'suporte', label: 'Suporte', icon: <LifeBuoy />, href: '/suporte', badge: 'Novo' },
  { key: 'configuracoes', label: 'Configuracoes', icon: <Settings />, href: '/configuracoes' },
]);

const mockUser = {
  name: 'Maria Silva',
  email: 'maria@ethos.com.br',
};

const mockNotifications = [
  {
    id: '1',
    title: 'Novo pedido recebido',
    description: 'Pedido #1042 de Joao Pereira',
    read: false,
  },
  {
    id: '2',
    title: 'Pagamento confirmado',
    description: 'Fatura #87 — R$ 1.250,00',
    read: false,
  },
  {
    id: '3',
    title: 'Backup concluido',
    description: 'Backup automatico realizado',
    read: true,
  },
];

const DashboardContent = () => (
  <div className="flex flex-col gap-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
      <p className="text-muted-foreground text-sm">Visao geral do seu negocio.</p>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <KpiCard label="Receita do mes" value="R$ 48.290" trend={{ direction: 'up', value: 12 }} />
      <KpiCard label="Pedidos" value={142} trend={{ direction: 'up', value: 8 }} />
      <KpiCard label="Ticket medio" value="R$ 340" trend={{ direction: 'down', value: 3 }} />
    </div>
  </div>
);

const handleUserAction = (key: string) => {
  console.log('user action:', key);
};

const handleNotificationClick = (id: string) => {
  console.log('notification:', id);
};

// ─────────────────────────────────────────────────────────────────────────────
// Default
// ─────────────────────────────────────────────────────────────────────────────
export const Default: Story = {
  render: () => (
    <DashboardLayout
      config={mockConfig}
      logo={<EthosWordmark />}
      productName="Ethos"
      activeKey="inicio"
      user={mockUser}
      onUserAction={handleUserAction}
      notifications={mockNotifications}
      onNotificationClick={handleNotificationClick}
      storageKey="story-default"
    >
      <DashboardContent />
    </DashboardLayout>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Collapsed
// ─────────────────────────────────────────────────────────────────────────────
export const Collapsed: Story = {
  render: () => (
    <DashboardLayout
      config={mockConfig}
      logo={<EthosWordmark />}
      productName="Ethos"
      activeKey="inicio"
      user={mockUser}
      onUserAction={handleUserAction}
      notifications={mockNotifications}
      onNotificationClick={handleNotificationClick}
      defaultCollapsed
      storageKey="story-collapsed"
    >
      <DashboardContent />
    </DashboardLayout>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// MobileView — viewport 375px
// ─────────────────────────────────────────────────────────────────────────────
export const MobileView: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => (
    <DashboardLayout
      config={mockConfig}
      logo={<EthosWordmark />}
      productName="Ethos"
      activeKey="inicio"
      user={mockUser}
      onUserAction={handleUserAction}
      notifications={mockNotifications}
      onNotificationClick={handleNotificationClick}
      storageKey="story-mobile"
    >
      <DashboardContent />
    </DashboardLayout>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// WithBreadcrumbs
// ─────────────────────────────────────────────────────────────────────────────
export const WithBreadcrumbs: Story = {
  render: () => (
    <DashboardLayout
      config={mockConfig}
      logo={<EthosWordmark />}
      productName="Ethos"
      activeKey="clientes-lista"
      user={mockUser}
      onUserAction={handleUserAction}
      notifications={mockNotifications}
      onNotificationClick={handleNotificationClick}
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Clientes', href: '/clientes' },
        { label: 'Maria' },
      ]}
      storageKey="story-breadcrumbs"
    >
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Maria Silva</h1>
        <p className="text-muted-foreground text-sm">Detalhes do cliente.</p>
      </div>
    </DashboardLayout>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// FullExample — todas as features combinadas
// ─────────────────────────────────────────────────────────────────────────────
export const FullExample: Story = {
  render: () => (
    <DashboardLayout
      config={mockConfig}
      logo={<EthosWordmark />}
      productName="Ethos"
      activeKey="vendas-pedidos"
      user={{ ...mockUser, avatarSrc: 'https://i.pravatar.cc/100?img=47' }}
      onUserAction={handleUserAction}
      notifications={mockNotifications}
      onNotificationClick={handleNotificationClick}
      searchPlaceholder="Buscar pedidos, clientes, faturas..."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Vendas', href: '/vendas' },
        { label: 'Pedidos' },
      ]}
      storageKey="story-full"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground text-sm">Acompanhe os pedidos do mes.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard label="Total" value={142} trend={{ direction: 'up', value: 8 }} />
          <KpiCard label="Em aberto" value={23} trend={{ direction: 'down', value: 5 }} />
          <KpiCard label="Receita" value="R$ 48.290" trend={{ direction: 'up', value: 12 }} />
          <KpiCard label="Ticket medio" value="R$ 340" trend={{ direction: 'neutral', value: 0 }} />
        </div>
        <div className="rounded-md border">
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold">Pedidos recentes</h2>
          </div>
          <div className="text-muted-foreground p-4 text-sm">Tabela de pedidos aqui.</div>
        </div>
      </div>
    </DashboardLayout>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// WithoutNotifications
// ─────────────────────────────────────────────────────────────────────────────
export const WithoutNotifications: Story = {
  render: () => (
    <DashboardLayout
      config={mockConfig}
      logo={<EthosWordmark />}
      productName="Ethos"
      activeKey="inicio"
      user={mockUser}
      onUserAction={handleUserAction}
      notifications={[]}
      storageKey="story-no-notifs"
    >
      <DashboardContent />
    </DashboardLayout>
  ),
};
