import type { Meta, StoryObj } from '@storybook/react';
import { ArrowRight, Mail, Trash2 } from 'lucide-react';

import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Primitivas/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'],
    },
    size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { children: 'Botão', variant: 'default', size: 'default' },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Excluir' } };
export const Link: Story = { args: { variant: 'link', children: 'Ver mais' } };

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">
        Pequeno
      </Button>
      <Button {...args} size="default">
        Padrão
      </Button>
      <Button {...args} size="lg">
        Grande
      </Button>
      <Button {...args} size="icon" aria-label="Email">
        <Mail />
      </Button>
    </div>
  ),
};

export const Loading: Story = {
  args: { loading: true, children: 'Salvando...' },
};

export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      Avançar <ArrowRight />
    </Button>
  ),
};

export const IconOnly: Story = {
  args: { size: 'icon', 'aria-label': 'Excluir', children: <Trash2 /> },
};

export const AsChild: Story = {
  render: (args) => (
    <Button {...args} asChild>
      <a href="#" rel="noreferrer">
        Link estilizado como botão
      </a>
    </Button>
  ),
};
