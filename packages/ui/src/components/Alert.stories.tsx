import type { Meta, StoryObj } from '@storybook/react';
import { AlertCircle, CheckCircle2, Info, Terminal, TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Feedback/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  render: () => (
    <Alert className="max-w-md">
      <Terminal />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>Você pode adicionar componentes ao seu app usando a CLI.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="max-w-md">
      <AlertCircle />
      <AlertTitle>Erro</AlertTitle>
      <AlertDescription>Não foi possível salvar suas alterações. Tente novamente.</AlertDescription>
    </Alert>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <Alert variant="success">
        <CheckCircle2 />
        <AlertTitle>Tudo certo</AlertTitle>
        <AlertDescription>Cliente cadastrado com sucesso.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>Atenção</AlertTitle>
        <AlertDescription>Sua sessão expira em 5 minutos.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <Info />
        <AlertTitle>Dica</AlertTitle>
        <AlertDescription>Use Cmd+K para abrir a paleta de comandos.</AlertDescription>
      </Alert>
    </div>
  ),
};
