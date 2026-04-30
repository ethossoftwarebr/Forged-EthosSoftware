import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Controller, type Control, type FieldValues } from 'react-hook-form';
import { z } from 'zod';

import { Slider } from '../Slider';

import type { Field } from './types';

import { FormBuilder } from './index';

const meta: Meta<typeof FormBuilder> = {
  title: 'Compostos/FormBuilder',
  component: FormBuilder,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof FormBuilder>;

const SubmittedPreview = ({ data }: { data: unknown }) => {
  if (data === null) return null;
  return (
    <pre className="bg-muted text-muted-foreground mt-6 max-w-2xl overflow-auto rounded-md p-3 text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SimpleLogin
// ─────────────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
});
type LoginValues = z.infer<typeof loginSchema>;

const loginFields: Field[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'voce@exemplo.com',
  },
  {
    name: 'password',
    label: 'Senha',
    type: 'password',
    required: true,
    helperText: 'Minimo 8 caracteres',
  },
];

const SimpleLoginDemo = () => {
  const [submitted, setSubmitted] = useState<LoginValues | null>(null);
  return (
    <div className="max-w-md">
      <FormBuilder
        schema={loginSchema}
        fields={loginFields}
        onSubmit={(values) => setSubmitted(values)}
        submitLabel="Entrar"
      />
      <SubmittedPreview data={submitted} />
    </div>
  );
};

export const SimpleLogin: Story = {
  render: () => <SimpleLoginDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// MultiColumn (cols=2)
// ─────────────────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(1, 'Obrigatorio'),
  lastName: z.string().min(1, 'Obrigatorio'),
  email: z.string().email('Email invalido'),
  role: z.string().min(1, 'Selecione um papel'),
  active: z.boolean(),
  birthday: z.date().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const profileFields: Field[] = [
  { name: 'firstName', label: 'Nome', type: 'text', required: true },
  { name: 'lastName', label: 'Sobrenome', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  {
    name: 'role',
    label: 'Papel',
    type: 'select',
    required: true,
    placeholder: 'Selecione...',
    options: [
      { value: 'owner', label: 'Owner' },
      { value: 'admin', label: 'Admin' },
      { value: 'manager', label: 'Manager' },
      { value: 'member', label: 'Member' },
      { value: 'viewer', label: 'Viewer' },
    ],
  },
  { name: 'active', label: 'Status', type: 'switch', placeholder: 'Usuario ativo' },
  { name: 'birthday', label: 'Aniversario', type: 'date' },
];

const MultiColumnDemo = () => {
  const [submitted, setSubmitted] = useState<ProfileValues | null>(null);
  return (
    <div className="max-w-3xl">
      <FormBuilder
        schema={profileSchema}
        fields={profileFields}
        cols={2}
        defaultValues={{ active: true } as Partial<ProfileValues> as never}
        onSubmit={(values) => setSubmitted(values)}
        onCancel={() => setSubmitted(null)}
      />
      <SubmittedPreview data={submitted} />
    </div>
  );
};

export const MultiColumn: Story = {
  render: () => <MultiColumnDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// AllFieldTypes — 12 tipos
// ─────────────────────────────────────────────────────────────────────────────
const allTypesSchema = z.object({
  text: z.string().min(1),
  number: z.coerce.number().min(0),
  email: z.string().email(),
  password: z.string().min(8),
  textarea: z.string().min(10),
  select: z.string().min(1),
  multiselect: z.array(z.string()).min(1, 'Selecione pelo menos 1'),
  checkbox: z.boolean(),
  switchField: z.boolean(),
  date: z.date(),
  file: z.unknown().optional(),
  custom: z.number().min(0).max(100),
});
type AllTypesValues = z.infer<typeof allTypesSchema>;

const allTypesFields: Field[] = [
  { name: 'text', label: 'Texto', type: 'text', required: true, placeholder: 'Digite algo' },
  { name: 'number', label: 'Numero', type: 'number', required: true, placeholder: '0' },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'password', label: 'Senha', type: 'password', required: true },
  {
    name: 'textarea',
    label: 'Descricao',
    type: 'textarea',
    required: true,
    helperText: 'Minimo 10 caracteres',
  },
  {
    name: 'select',
    label: 'Categoria',
    type: 'select',
    required: true,
    placeholder: 'Escolha...',
    options: [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
      { value: 'c', label: 'Gamma' },
    ],
  },
  {
    name: 'multiselect',
    label: 'Tags',
    type: 'multiselect',
    required: true,
    options: [
      { value: 'urgent', label: 'Urgente' },
      { value: 'review', label: 'Em revisao' },
      { value: 'blocked', label: 'Bloqueado' },
      { value: 'done', label: 'Concluido' },
    ],
  },
  {
    name: 'checkbox',
    label: 'Termos',
    type: 'checkbox',
    placeholder: 'Aceito os termos de uso',
  },
  {
    name: 'switchField',
    label: 'Notificacoes',
    type: 'switch',
    placeholder: 'Receber por email',
  },
  { name: 'date', label: 'Data', type: 'date', required: true },
  { name: 'file', label: 'Anexo', type: 'file', accept: '.pdf,.png,.jpg' },
  {
    name: 'custom',
    label: 'Volume (custom slider)',
    type: 'custom',
    helperText: 'Demonstra um campo custom usando Slider',
    render: ({ control, name, disabled }) => (
      <Controller
        control={control as Control<FieldValues>}
        name={name}
        render={({ field: f }) => (
          <div className="space-y-2">
            <Slider
              value={[typeof f.value === 'number' ? f.value : 50]}
              onValueChange={(v) => f.onChange(v[0])}
              min={0}
              max={100}
              step={1}
              disabled={disabled}
            />
            <div className="text-muted-foreground text-xs">
              Valor: <span className="font-mono">{typeof f.value === 'number' ? f.value : 50}</span>
            </div>
          </div>
        )}
      />
    ),
  },
];

const AllFieldTypesDemo = () => {
  const [submitted, setSubmitted] = useState<AllTypesValues | null>(null);
  return (
    <div className="max-w-3xl">
      <FormBuilder
        schema={allTypesSchema}
        fields={allTypesFields}
        cols={2}
        defaultValues={
          {
            checkbox: false,
            switchField: true,
            multiselect: [],
            custom: 50,
          } as Partial<AllTypesValues> as never
        }
        onSubmit={(values) => setSubmitted(values)}
      />
      <SubmittedPreview data={submitted} />
    </div>
  );
};

export const AllFieldTypes: Story = {
  render: () => <AllFieldTypesDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// WithDefaultValues
// ─────────────────────────────────────────────────────────────────────────────
const settingsSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  active: z.boolean(),
});
type SettingsValues = z.infer<typeof settingsSchema>;

const settingsFields: Field[] = [
  { name: 'name', label: 'Nome', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'active', label: 'Status', type: 'switch', placeholder: 'Conta ativa' },
];

const WithDefaultValuesDemo = () => {
  const [submitted, setSubmitted] = useState<SettingsValues | null>(null);
  return (
    <div className="max-w-md">
      <FormBuilder
        schema={settingsSchema}
        fields={settingsFields}
        defaultValues={
          {
            name: 'Joao Pinheiro',
            email: 'joao@ethos.dev',
            active: true,
          } as SettingsValues as never
        }
        onSubmit={(values) => setSubmitted(values)}
      />
      <SubmittedPreview data={submitted} />
    </div>
  );
};

export const WithDefaultValues: Story = {
  render: () => <WithDefaultValuesDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// CustomField (foco em type='custom')
// ─────────────────────────────────────────────────────────────────────────────
const pricingSchema = z.object({
  product: z.string().min(1),
  discount: z.number().min(0).max(100),
});
type PricingValues = z.infer<typeof pricingSchema>;

const pricingFields: Field[] = [
  { name: 'product', label: 'Produto', type: 'text', required: true },
  {
    name: 'discount',
    label: 'Desconto (%)',
    type: 'custom',
    helperText: 'Use o slider para ajustar entre 0 e 100',
    render: ({ control, name }) => (
      <Controller
        control={control as Control<FieldValues>}
        name={name}
        render={({ field: f }) => {
          const value = typeof f.value === 'number' ? f.value : 0;
          return (
            <div className="space-y-2">
              <Slider
                value={[value]}
                onValueChange={(v) => f.onChange(v[0])}
                min={0}
                max={100}
                step={5}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">0%</span>
                <span className="font-mono font-semibold">{value}%</span>
                <span className="text-muted-foreground">100%</span>
              </div>
            </div>
          );
        }}
      />
    ),
  },
];

const CustomFieldDemo = () => {
  const [submitted, setSubmitted] = useState<PricingValues | null>(null);
  return (
    <div className="max-w-md">
      <FormBuilder
        schema={pricingSchema}
        fields={pricingFields}
        defaultValues={{ discount: 10 } as Partial<PricingValues> as never}
        onSubmit={(values) => setSubmitted(values)}
      />
      <SubmittedPreview data={submitted} />
    </div>
  );
};

export const CustomField: Story = {
  render: () => <CustomFieldDemo />,
};
