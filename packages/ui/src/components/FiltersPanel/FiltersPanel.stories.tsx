import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '../Card';

import type { Filter, FiltersValues } from './types';

import { FiltersPanel } from './index';

const meta: Meta<typeof FiltersPanel> = {
  title: 'Compostos/FiltersPanel',
  component: FiltersPanel,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof FiltersPanel>;

const ValuesPreview = ({ values }: { values: FiltersValues }) => (
  <pre className="bg-muted text-muted-foreground mt-6 max-w-md overflow-auto rounded-md p-3 text-xs">
    {JSON.stringify(values, (_k, v: unknown) => (v instanceof Date ? v.toISOString() : v), 2)}
  </pre>
);

// ─────────────────────────────────────────────────────────────────────────────
// SheetMode (default)
// ─────────────────────────────────────────────────────────────────────────────
const sheetFilters: Filter[] = [
  {
    key: 'q',
    label: 'Busca',
    type: 'search',
    placeholder: 'Procurar pedidos...',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    placeholder: 'Todos',
    options: [
      { value: 'pending', label: 'Pendente' },
      { value: 'paid', label: 'Pago' },
      { value: 'shipped', label: 'Enviado' },
      { value: 'cancelled', label: 'Cancelado' },
    ],
  },
  {
    key: 'amount',
    label: 'Valor',
    type: 'range',
    min: 0,
    max: 1000,
    step: 10,
    formatLabel: (v) => `R$ ${v.toFixed(0)}`,
  },
];

const SheetModeDemo = () => {
  const [values, setValues] = useState<FiltersValues>({});
  return (
    <div className="space-y-4">
      <FiltersPanel filters={sheetFilters} values={values} onChange={setValues} />
      <ValuesPreview values={values} />
    </div>
  );
};

export const SheetMode: Story = {
  render: () => <SheetModeDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// InlineMode
// ─────────────────────────────────────────────────────────────────────────────
const InlineModeDemo = () => {
  const [values, setValues] = useState<FiltersValues>({});
  return (
    <div className="flex gap-4">
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <FiltersPanel mode="inline" filters={sheetFilters} values={values} onChange={setValues} />
        </CardContent>
      </Card>
      <div className="flex-1">
        <ValuesPreview values={values} />
      </div>
    </div>
  );
};

export const InlineMode: Story = {
  render: () => <InlineModeDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// AllFieldTypes
// ─────────────────────────────────────────────────────────────────────────────
const allFieldFilters: Filter[] = [
  {
    key: 'search',
    label: 'Busca',
    type: 'search',
    placeholder: 'Digite para buscar...',
  },
  {
    key: 'category',
    label: 'Categoria',
    type: 'select',
    placeholder: 'Selecione',
    options: [
      { value: 'a', label: 'Categoria A' },
      { value: 'b', label: 'Categoria B' },
      { value: 'c', label: 'Categoria C' },
    ],
  },
  {
    key: 'tags',
    label: 'Tags',
    type: 'multiselect',
    options: [
      { value: 'urgent', label: 'Urgente' },
      { value: 'review', label: 'Em revisao' },
      { value: 'archived', label: 'Arquivado' },
    ],
  },
  {
    key: 'price',
    label: 'Preco',
    type: 'range',
    min: 0,
    max: 100,
    step: 5,
    formatLabel: (v) => `R$ ${v}`,
  },
  {
    key: 'period',
    label: 'Periodo',
    type: 'daterange',
    helperText: 'Selecione o intervalo de datas',
  },
];

const AllFieldTypesDemo = () => {
  const [values, setValues] = useState<FiltersValues>({});
  return (
    <div className="max-w-md">
      <FiltersPanel mode="inline" filters={allFieldFilters} values={values} onChange={setValues} />
      <ValuesPreview values={values} />
    </div>
  );
};

export const AllFieldTypes: Story = {
  render: () => <AllFieldTypesDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// WithInitialValues
// ─────────────────────────────────────────────────────────────────────────────
const WithInitialValuesDemo = () => {
  const [values, setValues] = useState<FiltersValues>({
    price: [200, 800],
    category: 'electronics',
    tags: ['urgent'],
  });
  const filters: Filter[] = [
    {
      key: 'category',
      label: 'Categoria',
      type: 'select',
      placeholder: 'Selecione',
      options: [
        { value: 'electronics', label: 'Eletronicos' },
        { value: 'fashion', label: 'Moda' },
        { value: 'home', label: 'Casa' },
      ],
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'multiselect',
      options: [
        { value: 'urgent', label: 'Urgente' },
        { value: 'sale', label: 'Promocao' },
        { value: 'new', label: 'Novo' },
      ],
    },
    {
      key: 'price',
      label: 'Preco',
      type: 'range',
      min: 0,
      max: 1000,
      step: 50,
      formatLabel: (v) => `R$ ${v}`,
    },
  ];
  return (
    <div className="max-w-md">
      <FiltersPanel mode="inline" filters={filters} values={values} onChange={setValues} />
      <ValuesPreview values={values} />
    </div>
  );
};

export const WithInitialValues: Story = {
  render: () => <WithInitialValuesDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// EcommerceExample
// ─────────────────────────────────────────────────────────────────────────────
const ecommerceFilters: Filter[] = [
  {
    key: 'name',
    label: 'Nome do produto',
    type: 'search',
    placeholder: 'Ex: tenis...',
  },
  {
    key: 'price',
    label: 'Faixa de preco',
    type: 'range',
    min: 0,
    max: 5000,
    step: 50,
    formatLabel: (v) => `R$ ${v.toFixed(0)}`,
  },
  {
    key: 'category',
    label: 'Categorias',
    type: 'multiselect',
    options: [
      { value: 'shoes', label: 'Calcados' },
      { value: 'clothing', label: 'Vestuario' },
      { value: 'accessories', label: 'Acessorios' },
    ],
  },
  {
    key: 'createdAt',
    label: 'Data do pedido',
    type: 'daterange',
    helperText: 'Filtra por data de criacao do pedido',
  },
];

const EcommerceDemo = () => {
  const [values, setValues] = useState<FiltersValues>({
    price: [0, 5000],
  });
  const handleApply = () => {
    // Em producao, dispararia query/refetch.
    console.info('Aplicando filtros', values);
  };
  return (
    <div className="space-y-4">
      <FiltersPanel
        filters={ecommerceFilters}
        values={values}
        onChange={setValues}
        onApply={handleApply}
        title="Filtrar pedidos"
      />
      <ValuesPreview values={values} />
    </div>
  );
};

export const EcommerceExample: Story = {
  render: () => <EcommerceDemo />,
};
