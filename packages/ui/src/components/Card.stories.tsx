import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Primitivas/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Resumo do mês</CardTitle>
        <CardDescription>Visão geral dos contratos ativos.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Este card ilustra o padrão visual definido no doc 02 §&quot;Card padrão&quot;.
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost">Cancelar</Button>
        <Button>Confirmar</Button>
      </CardFooter>
    </Card>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <Card className="w-[280px]">
      <CardHeader>
        <CardTitle>Receita</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-3xl font-semibold">R$ 12.420</span>
      </CardContent>
    </Card>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Card className="w-[320px]">
      <CardHeader>
        <CardTitle>Convide um cliente</CardTitle>
        <CardDescription>Adicione um cliente para começar a faturar.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button>Adicionar cliente</Button>
      </CardFooter>
    </Card>
  ),
};

export const KpiPlaceholder: Story = {
  render: () => (
    <Card className="w-[260px]">
      <CardHeader className="pb-2">
        <CardDescription>Contratos ativos</CardDescription>
        <CardTitle className="text-3xl">142</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-muted-foreground text-xs">+12% vs mês anterior</span>
      </CardContent>
    </Card>
  ),
};
