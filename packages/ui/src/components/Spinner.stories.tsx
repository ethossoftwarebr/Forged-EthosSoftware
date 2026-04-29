import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Feedback/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  render: () => <Spinner />,
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Spinner size="sm" />
      <Spinner size="default" />
      <Spinner size="lg" />
    </div>
  ),
};

export const Inline: Story = {
  render: () => (
    <Button disabled>
      <Spinner size="sm" />
      Salvando...
    </Button>
  ),
};
