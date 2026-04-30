import type { ReactNode } from 'react';

export type FilterType = 'range' | 'select' | 'multiselect' | 'daterange' | 'search';

export interface BaseFilter {
  key: string;
  label: string;
  type: FilterType;
  helperText?: string;
  disabled?: boolean;
}

export interface RangeFilter extends BaseFilter {
  type: 'range';
  min: number;
  max: number;
  /** Default 1. */
  step?: number;
  /** Custom formatter para exibicao do valor. Ex: `(v) => \`R$ ${v.toFixed(0)}\``. */
  formatLabel?: (value: number) => string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface SelectFilter extends BaseFilter {
  type: 'select';
  options: FilterOption[];
  placeholder?: string;
}

export interface MultiselectFilter extends BaseFilter {
  type: 'multiselect';
  options: FilterOption[];
}

export interface DaterangeFilter extends BaseFilter {
  type: 'daterange';
}

export interface SearchFilter extends BaseFilter {
  type: 'search';
  placeholder?: string;
}

export type Filter =
  | RangeFilter
  | SelectFilter
  | MultiselectFilter
  | DaterangeFilter
  | SearchFilter;

export type FilterValue =
  | [number, number]
  | string
  | string[]
  | { from?: Date; to?: Date }
  | undefined;

export type FiltersValues = Record<string, FilterValue>;

export type FiltersPanelMode = 'sheet' | 'inline';

export interface FiltersPanelProps {
  filters: Filter[];
  values: FiltersValues;
  onChange: (values: FiltersValues) => void;
  /**
   * Quando definido, sobrescreve o comportamento default ao clicar em "Limpar tudo".
   * Default: chama `onChange({})`.
   */
  onClear?: () => void;
  /** Quando definido, renderiza botao "Aplicar" no footer. */
  onApply?: () => void;
  /** Default `'sheet'`. */
  mode?: FiltersPanelMode;
  /** Custom trigger para `mode='sheet'`. Default: `<Button variant="outline">{title}</Button>`. */
  trigger?: ReactNode;
  /** Default `'Filtros'`. */
  title?: string;
  /** Default `'Aplicar'`. */
  applyLabel?: string;
  /** Default `'Limpar tudo'`. */
  clearLabel?: string;
  className?: string;
}

export interface FieldsRendererProps {
  filters: Filter[];
  values: FiltersValues;
  onChange: (values: FiltersValues) => void;
}
