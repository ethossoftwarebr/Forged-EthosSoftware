import type { Meta, StoryObj } from '@storybook/react';

import { FormField } from './FormField';
import { Input } from './Input';
import { Textarea } from './Textarea';

const meta: Meta<typeof FormField> = {
  title: 'Forms/FormField',
  component: FormField,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  render: () => (
    <div className="w-[360px]">
      <FormField name="email" label="Email">
        <Input type="email" placeholder="seu@email.com" />
      </FormField>
    </div>
  ),
};

export const WithHint: Story = {
  render: () => (
    <div className="w-[360px]">
      <FormField
        name="username"
        label="Usuario"
        hint="3 a 20 caracteres, apenas letras e numeros."
        required
      >
        <Input placeholder="ex: maria_silva" />
      </FormField>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="w-[360px]">
      <FormField
        name="password"
        label="Senha"
        error="Senha deve ter ao menos 8 caracteres."
        required
      >
        <Input type="password" defaultValue="abc" />
      </FormField>
    </div>
  ),
};

export const WithTextarea: Story = {
  render: () => (
    <div className="w-[480px]">
      <FormField name="notes" label="Observacoes" hint="Opcional. Maximo 500 caracteres.">
        <Textarea rows={4} placeholder="Anote algo sobre este cliente..." />
      </FormField>
    </div>
  ),
};
