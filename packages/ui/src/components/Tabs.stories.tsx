import type { Meta, StoryObj } from '@storybook/react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Navigation/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="conta" className="w-[420px]">
      <TabsList>
        <TabsTrigger value="conta">Conta</TabsTrigger>
        <TabsTrigger value="senha">Senha</TabsTrigger>
        <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
      </TabsList>
      <TabsContent value="conta">
        <p className="text-muted-foreground text-sm">
          Atualize as informações da sua conta. Salve quando estiver pronto.
        </p>
      </TabsContent>
      <TabsContent value="senha">
        <p className="text-muted-foreground text-sm">Altere sua senha aqui.</p>
      </TabsContent>
      <TabsContent value="notificacoes">
        <p className="text-muted-foreground text-sm">Configure suas notificações.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabled: Story = {
  render: () => (
    <Tabs defaultValue="ativos" className="w-[480px]">
      <TabsList>
        <TabsTrigger value="ativos">Ativos</TabsTrigger>
        <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
        <TabsTrigger value="excluidos" disabled>
          Excluídos
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ativos">
        <p className="text-sm">12 itens ativos.</p>
      </TabsContent>
      <TabsContent value="arquivados">
        <p className="text-sm">3 itens arquivados.</p>
      </TabsContent>
      <TabsContent value="excluidos">
        <p className="text-sm">Aba indisponível.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const ManyTabs: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[640px]">
      <TabsList>
        <TabsTrigger value="overview">Visão geral</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Relatórios</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
        <TabsTrigger value="billing">Cobrança</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm">Métricas principais do mês.</p>
      </TabsContent>
      <TabsContent value="analytics">
        <p className="text-sm">Tráfego e conversão detalhados.</p>
      </TabsContent>
      <TabsContent value="reports">
        <p className="text-sm">Relatórios mensais exportáveis.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm">Preferências do workspace.</p>
      </TabsContent>
      <TabsContent value="billing">
        <p className="text-sm">Plano e métodos de pagamento.</p>
      </TabsContent>
    </Tabs>
  ),
};
