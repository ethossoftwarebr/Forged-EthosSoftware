import type { Meta, StoryObj } from '@storybook/react';

import { UserAvatar } from './index';

const meta: Meta<typeof UserAvatar> = {
  title: 'Compostos/UserAvatar',
  component: UserAvatar,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { name: 'Maria Silva' },
};

export default meta;
type Story = StoryObj<typeof UserAvatar>;

export const Default: Story = {
  args: {
    name: 'Maria Silva',
    src: 'https://i.pravatar.cc/100?img=12',
  },
};

export const FallbackInitials: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <UserAvatar name="Maria Silva" />
      <UserAvatar name="Joao" />
      <UserAvatar name="Ana Beatriz Costa" />
      <UserAvatar name="" />
    </div>
  ),
};

export const OnlineIndicator: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <UserAvatar name="Maria Silva" src="https://i.pravatar.cc/100?img=12" online />
      <UserAvatar name="Joao Pereira" online />
      <UserAvatar name="Ana Costa" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <UserAvatar name="Maria Silva" size="sm" />
      <UserAvatar name="Maria Silva" size="default" />
      <UserAvatar name="Maria Silva" size="lg" />
      <UserAvatar name="Maria Silva" size="lg" online />
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <div className="flex items-center">
      <UserAvatar
        name="Maria Silva"
        src="https://i.pravatar.cc/100?img=12"
        className="border-background border-2"
      />
      <UserAvatar
        name="Joao Pereira"
        src="https://i.pravatar.cc/100?img=14"
        className="border-background -ml-2 border-2"
      />
      <UserAvatar
        name="Ana Costa"
        src="https://i.pravatar.cc/100?img=18"
        className="border-background -ml-2 border-2"
      />
      <UserAvatar name="Pedro Lima" className="border-background -ml-2 border-2" />
      <UserAvatar
        name="+ 12"
        className="border-background [&>span]:bg-primary [&>span]:text-primary-foreground -ml-2 border-2"
      />
    </div>
  ),
};
