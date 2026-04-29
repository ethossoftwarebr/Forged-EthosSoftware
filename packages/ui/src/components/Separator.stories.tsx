import type { Meta, StoryObj } from '@storybook/react';

import { Separator } from './Separator';

const meta: Meta<typeof Separator> = {
  title: 'Layout/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[320px] space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Conta Ethos</h4>
        <p className="text-muted-foreground text-sm">Gerencie sua conta e preferências.</p>
      </div>
      <Separator />
      <div className="text-muted-foreground flex h-5 items-center space-x-4 text-sm">
        <div>Perfil</div>
        <div>Cobrança</div>
        <div>Notificações</div>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="text-muted-foreground flex h-5 items-center space-x-4 text-sm">
      <span>Sobre</span>
      <Separator orientation="vertical" />
      <span>Termos</span>
      <Separator orientation="vertical" />
      <span>Privacidade</span>
    </div>
  ),
};

export const InlineUsage: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium">v1.0.0</span>
      <Separator orientation="vertical" className="h-4" />
      <span className="text-muted-foreground">build 2026-04-28</span>
    </div>
  ),
};
