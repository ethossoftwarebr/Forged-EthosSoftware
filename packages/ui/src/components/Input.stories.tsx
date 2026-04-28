import type { Meta, StoryObj } from '@storybook/react';

import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Primitivas/Input',
  component: Input,
  tags: ['autodocs'],
  args: { placeholder: 'Digite...' },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const WithPlaceholder: Story = { args: { placeholder: 'seu@email.com' } };
export const Disabled: Story = { args: { disabled: true, value: 'somente leitura' } };
export const Email: Story = { args: { type: 'email', placeholder: 'seu@email.com' } };
export const Password: Story = { args: { type: 'password', placeholder: '••••••••' } };
export const Number: Story = { args: { type: 'number', placeholder: '0' } };
export const ErrorState: Story = {
  args: {
    placeholder: 'campo inválido',
    'aria-invalid': true,
    className: 'border-destructive focus-visible:ring-destructive',
  },
};
