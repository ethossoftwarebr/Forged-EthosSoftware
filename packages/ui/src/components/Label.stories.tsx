import type { Meta, StoryObj } from '@storybook/react';

import { Input } from './Input';
import { Label } from './Label';

const meta: Meta<typeof Label> = {
  title: 'Forms/Label',
  component: Label,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { children: 'Email' },
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {};

export const WithInput: Story = {
  render: (args) => (
    <div className="space-y-2">
      <Label htmlFor="email" {...args}>
        Email
      </Label>
      <Input id="email" type="email" placeholder="seu@email.com" />
    </div>
  ),
};

export const WithDisabledPeer: Story = {
  render: () => (
    <div className="space-y-2">
      <Input id="peer-input" className="peer" disabled placeholder="campo desabilitado" />
      <Label htmlFor="peer-input">Label vinculada (peer-disabled aplica opacidade)</Label>
    </div>
  ),
};
