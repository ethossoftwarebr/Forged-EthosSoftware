import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';
import { Toaster, toast } from './Toast';

const meta: Meta<typeof Toaster> = {
  title: 'Feedback/Toast',
  component: Toaster,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <>
        <Toaster />
        <Story />
      </>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Toaster>;

export const BasicToast: Story = {
  render: () => <Button onClick={() => toast('Notificação enviada')}>Disparar toast</Button>,
};

export const SuccessToast: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button variant="default" onClick={() => toast.success('Cliente salvo com sucesso')}>
        Success
      </Button>
      <Button variant="destructive" onClick={() => toast.error('Falha ao salvar cliente')}>
        Error
      </Button>
      <Button variant="secondary" onClick={() => toast.info('Nova versão disponível')}>
        Info
      </Button>
      <Button variant="outline" onClick={() => toast.warning('Sessão expirando')}>
        Warning
      </Button>
    </div>
  ),
};

export const PromiseToast: Story = {
  render: () => (
    <Button
      onClick={() =>
        toast.promise(
          new Promise<{ name: string }>((resolve) =>
            setTimeout(() => resolve({ name: 'Maria Silva' }), 1500),
          ),
          {
            loading: 'Salvando cliente...',
            success: (data) => `${data.name} cadastrada com sucesso`,
            error: 'Erro ao cadastrar cliente',
          },
        )
      }
    >
      Disparar promise
    </Button>
  ),
};
