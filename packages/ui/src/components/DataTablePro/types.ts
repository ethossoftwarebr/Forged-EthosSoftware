import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  /** Chave da coluna. Costuma ser uma propriedade da row, mas string aberto para permitir colunas computadas. */
  key: string;
  /** Cabecalho da coluna. */
  label: string;
  /** Habilita ordenacao client-side por essa coluna. */
  sortable?: boolean;
  /** Render customizado da celula. Default: `String(row[key])`. */
  render?: (row: T) => ReactNode;
  /** Largura sugerida (CSS). Ex: `'120px'`, `'20%'`. */
  width?: string;
  /** Alinhamento do conteudo. */
  align?: 'left' | 'center' | 'right';
}

export interface FilterOption {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export interface BulkAction {
  key: string;
  label: string;
  variant?: 'default' | 'destructive';
  icon?: ReactNode;
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive';
  icon?: ReactNode;
  disabled?: (row: T) => boolean;
}

export type DataTableDensity = 'compact' | 'normal' | 'comfortable';

export interface VirtualizeOption {
  threshold: number;
}

export interface DataTableProProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  search?: {
    placeholder?: string;
    value?: string;
    onSearch: (q: string) => void;
  };
  filters?: FilterOption[];
  /** Valores controlados dos filtros. Quando definido, dispara `onFilterChange`. */
  filterValues?: Record<string, string | undefined>;
  onFilterChange?: (key: string, value: string | undefined) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  bulkActions?: BulkAction[];
  onBulkAction?: (key: string, selectedRows: T[]) => void;
  rowActions?: (row: T) => RowAction<T>[];
  onRowClick?: (row: T) => void;
  emptyState?: { title: string; description?: string };
  loading?: boolean;
  error?: { title: string; description?: string };
  /** Densidade visual das linhas. Default: `'normal'`. */
  density?: DataTableDensity;
  /**
   * Controle de virtualizacao.
   * - `undefined`: auto, virtualiza quando `data.length > 100`.
   * - `false`: desliga.
   * - `true`: liga sempre (threshold=0).
   * - `{ threshold: N }`: virtualiza quando `data.length > N`.
   */
  virtualize?: boolean | VirtualizeOption;
  /** Identificador unico da linha. Default: indice. */
  getRowId?: (row: T, index: number) => string;
  /** Quando `true`, mostra coluna de selecao mesmo sem `bulkActions`. */
  selectable?: boolean;
  className?: string;
}
