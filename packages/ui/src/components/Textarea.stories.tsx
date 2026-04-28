import type { Meta, StoryObj } from '@storybook/react';

import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Forms/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { placeholder: 'Digite uma mensagem...' },
  argTypes: {
    disabled: { control: 'boolean' },
    rows: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Conteudo somente leitura.' },
};

export const ErrorState: Story = {
  args: {
    'aria-invalid': true,
    className: 'border-destructive focus-visible:ring-destructive',
    defaultValue: 'Conteudo invalido conforme regra de negocio.',
  },
};

export const LongContent: Story = {
  args: {
    rows: 8,
    defaultValue:
      'Este textarea demonstra como o componente lida com conteudo extenso. O focus-visible ring usa o token --ring (primary). A altura minima e 80px e ele e responsivo a flex.',
  },
};
