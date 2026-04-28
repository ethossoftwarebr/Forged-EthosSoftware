import type { Meta, StoryObj } from '@storybook/react';

import { Label } from './Label';
import { Switch } from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'Forms/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  render: () => <Switch id="default-switch" aria-label="Notificacoes" />,
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="airplane" />
      <Label htmlFor="airplane">Modo offline</Label>
    </div>
  ),
};

export const Checked: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="darkmode" defaultChecked />
      <Label htmlFor="darkmode">Tema escuro</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Switch id="dis-off" disabled />
        <Label htmlFor="dis-off">Desabilitado (off)</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="dis-on" disabled defaultChecked />
        <Label htmlFor="dis-on">Desabilitado (on)</Label>
      </div>
    </div>
  ),
};
