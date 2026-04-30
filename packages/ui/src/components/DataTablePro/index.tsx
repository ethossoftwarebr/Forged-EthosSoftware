import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../DropdownMenu';
import { EmptyState } from '../EmptyState';
import { Input } from '../Input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../Pagination';
import { Skeleton } from '../Skeleton';

import type {
  BulkAction,
  DataTableColumn,
  DataTableDensity,
  DataTableProProps,
  RowAction,
  VirtualizeOption,
} from './types';

const densityRowClass: Record<DataTableDensity, string> = {
  compact: 'h-9',
  normal: 'h-12',
  comfortable: 'h-14',
};

const densityRowHeight: Record<DataTableDensity, number> = {
  compact: 36,
  normal: 48,
  comfortable: 56,
};

const densityCellClass: Record<DataTableDensity, string> = {
  compact: 'py-1.5 px-3',
  normal: 'py-3 px-3',
  comfortable: 'py-4 px-3',
};

function alignClass(align: DataTableColumn<unknown>['align']): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

function resolveThreshold(virtualize: boolean | VirtualizeOption | undefined): number {
  if (virtualize === undefined) return 100;
  if (virtualize === false) return Number.POSITIVE_INFINITY;
  if (virtualize === true) return 0;
  return virtualize.threshold;
}

interface RowActionsCellProps<T> {
  row: T;
  actions: RowAction<T>[];
}

function RowActionsCell<T>({ row, actions }: RowActionsCellProps<T>): ReactNode {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Acoes da linha"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {actions.map((action, idx) => (
          <DropdownMenuItem
            key={`${action.label}-${idx}`}
            disabled={action.disabled?.(row) ?? false}
            onSelect={() => action.onClick(row)}
            className={cn(
              action.variant === 'destructive' &&
                'text-destructive focus:text-destructive focus:bg-destructive/10',
            )}
          >
            {action.icon ? (
              <span aria-hidden="true" className="mr-2 [&>svg]:h-4 [&>svg]:w-4">
                {action.icon}
              </span>
            ) : null}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface BulkActionsBarProps<T> {
  selectedCount: number;
  selectedRows: T[];
  actions: BulkAction[];
  onAction: (key: string, rows: T[]) => void;
  onClear: () => void;
}

function BulkActionsBar<T>({
  selectedCount,
  selectedRows,
  actions,
  onAction,
  onClear,
}: BulkActionsBarProps<T>): ReactNode {
  if (selectedCount === 0) return null;
  return (
    <div className="bg-accent/50 border-accent flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
      <span className="font-medium">
        {selectedCount} {selectedCount === 1 ? 'selecionado' : 'selecionados'}
      </span>
      <div className="flex flex-1 flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.key}
            size="sm"
            variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
            onClick={() => onAction(action.key, selectedRows)}
          >
            {action.icon ? (
              <span aria-hidden="true" className="[&>svg]:h-4 [&>svg]:w-4">
                {action.icon}
              </span>
            ) : null}
            {action.label}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onClear} aria-label="Limpar selecao">
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function DataTablePro<T>(props: DataTableProProps<T>): ReactNode {
  const {
    data,
    columns,
    search,
    filters,
    filterValues,
    onFilterChange,
    pagination,
    bulkActions,
    onBulkAction,
    rowActions,
    onRowClick,
    emptyState,
    loading = false,
    error,
    density = 'normal',
    virtualize,
    getRowId,
    selectable = false,
    className,
  } = props;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchValue, setSearchValue] = useState(search?.value ?? '');

  // Mantem searchValue sincronizado quando o componente eh controlado externamente.
  useEffect(() => {
    if (search?.value !== undefined) setSearchValue(search.value);
  }, [search?.value]);

  const enableSelection = selectable || (bulkActions && bulkActions.length > 0) || false;
  const hasRowActions = !!rowActions;

  const columnDefs = useMemo<ColumnDef<T>[]>(() => {
    const defs: ColumnDef<T>[] = [];

    if (enableSelection) {
      defs.push({
        id: '__select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllRowsSelected()
                ? true
                : table.getIsSomeRowsSelected()
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
            aria-label="Selecionar todos"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Selecionar linha"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        size: 32,
      });
    }

    for (const col of columns) {
      defs.push({
        id: col.key,
        accessorFn: (row) => (row as Record<string, unknown>)[col.key],
        header: col.label,
        cell: ({ row }) =>
          col.render
            ? col.render(row.original)
            : String((row.original as Record<string, unknown>)[col.key] ?? ''),
        enableSorting: col.sortable ?? false,
        meta: { width: col.width, align: col.align },
      });
    }

    if (hasRowActions && rowActions) {
      defs.push({
        id: '__actions',
        header: '',
        cell: ({ row }) => <RowActionsCell row={row.original} actions={rowActions(row.original)} />,
        enableSorting: false,
        size: 48,
      });
    }

    return defs;
  }, [columns, enableSelection, hasRowActions, rowActions]);

  const table = useReactTable<T>({
    data,
    columns: columnDefs,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // Quando ha pagination prop (server-side), TanStack opera em modo manual.
    manualPagination: !!pagination,
    pageCount: pagination ? Math.ceil(pagination.total / pagination.pageSize) : undefined,
    getPaginationRowModel: pagination ? undefined : getPaginationRowModel(),
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
  });

  const rows = table.getRowModel().rows;
  const threshold = resolveThreshold(virtualize);
  const shouldVirtualize = data.length > threshold;
  const rowHeight = densityRowHeight[density];

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
    enabled: shouldVirtualize,
  });

  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : [];
  const totalSize = shouldVirtualize ? virtualizer.getTotalSize() : 0;

  const selectedRows = useMemo(
    () => table.getSelectedRowModel().rows.map((r) => r.original),
    [table, rowSelection],
  );

  const isFilteringActive = useMemo(() => {
    if (searchValue.trim().length > 0) return true;
    if (filterValues && Object.values(filterValues).some((v) => v !== undefined && v !== '')) {
      return true;
    }
    return false;
  }, [searchValue, filterValues]);

  const showSearch = !!search;
  const showFilters = !!filters && filters.length > 0;
  const showTopBar = showSearch || showFilters;

  const handleSearchChange = (next: string): void => {
    setSearchValue(next);
    search?.onSearch(next);
  };

  const renderHeader = (): ReactNode => (
    <thead className="bg-background sticky top-0 z-10 border-b">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const meta = header.column.columnDef.meta as
              | { width?: string; align?: DataTableColumn<unknown>['align'] }
              | undefined;
            const canSort = header.column.getCanSort();
            const sortDir = header.column.getIsSorted();
            const align = meta?.align;
            return (
              <th
                key={header.id}
                scope="col"
                style={{ width: meta?.width }}
                className={cn(
                  'text-muted-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide',
                  alignClass(align),
                )}
              >
                {header.isPlaceholder ? null : canSort ? (
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      'hover:text-foreground inline-flex items-center gap-1 transition-colors',
                      align === 'right' && 'flex-row-reverse',
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {sortDir === 'asc' ? (
                      <ArrowUp className="h-3 w-3" aria-hidden="true" />
                    ) : sortDir === 'desc' ? (
                      <ArrowDown className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-50" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  flexRender(header.column.columnDef.header, header.getContext())
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );

  const renderBodyRows = (): ReactNode => {
    if (loading) {
      const colCount = columnDefs.length;
      return (
        <tbody>
          {Array.from({ length: 5 }).map((_, rowIdx) => (
            <tr
              key={`skeleton-${rowIdx}`}
              className={cn('border-b last:border-0', densityRowClass[density])}
            >
              {Array.from({ length: colCount }).map((__, cellIdx) => (
                <td key={cellIdx} className={cn(densityCellClass[density])}>
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      );
    }

    if (rows.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={columnDefs.length} className="p-0">
              <EmptyState
                variant={isFilteringActive ? 'search-no-results' : 'empty'}
                title={
                  emptyState?.title ??
                  (isFilteringActive ? 'Nenhum resultado encontrado' : 'Nenhum item para exibir')
                }
                description={emptyState?.description}
              />
            </td>
          </tr>
        </tbody>
      );
    }

    if (shouldVirtualize) {
      const paddingTop = virtualItems[0]?.start ?? 0;
      const paddingBottom =
        virtualItems.length > 0 ? totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0) : 0;

      return (
        <tbody>
          {paddingTop > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={columnDefs.length} style={{ height: paddingTop, padding: 0 }} />
            </tr>
          ) : null}
          {virtualItems.map((vItem) => {
            const row = rows[vItem.index];
            if (!row) return null;
            return (
              <tr
                key={row.id}
                data-index={vItem.index}
                className={cn(
                  'hover:bg-muted/50 border-b last:border-0',
                  onRowClick && 'cursor-pointer',
                  row.getIsSelected() && 'bg-muted/30',
                  densityRowClass[density],
                )}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { width?: string; align?: DataTableColumn<unknown>['align'] }
                    | undefined;
                  return (
                    <td
                      key={cell.id}
                      style={{ width: meta?.width }}
                      className={cn('text-sm', densityCellClass[density], alignClass(meta?.align))}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {paddingBottom > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={columnDefs.length} style={{ height: paddingBottom, padding: 0 }} />
            </tr>
          ) : null}
        </tbody>
      );
    }

    return (
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className={cn(
              'hover:bg-muted/50 border-b last:border-0',
              onRowClick && 'cursor-pointer',
              row.getIsSelected() && 'bg-muted/30',
              densityRowClass[density],
            )}
            onClick={onRowClick ? () => onRowClick(row.original) : undefined}
          >
            {row.getVisibleCells().map((cell) => {
              const meta = cell.column.columnDef.meta as
                | { width?: string; align?: DataTableColumn<unknown>['align'] }
                | undefined;
              return (
                <td
                  key={cell.id}
                  style={{ width: meta?.width }}
                  className={cn('text-sm', densityCellClass[density], alignClass(meta?.align))}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    );
  };

  if (error) {
    return (
      <div className={cn('w-full', className)}>
        <EmptyState variant="error" title={error.title} description={error.description} />
      </div>
    );
  }

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {showTopBar ? (
        <div className="flex flex-wrap items-center gap-2">
          {showSearch ? (
            <div className="relative max-w-sm flex-1">
              <Search
                className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={search?.placeholder ?? 'Buscar...'}
                className="pl-8"
                aria-label="Buscar"
              />
            </div>
          ) : null}
          {showFilters && filters
            ? filters.map((filter) => {
                const current = filterValues?.[filter.key];
                return (
                  <DropdownMenu key={filter.key}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {filter.label}
                        {current
                          ? `: ${filter.options.find((o) => o.value === current)?.label ?? current}`
                          : ''}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>{filter.label}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={current ?? ''}
                        onValueChange={(v) =>
                          onFilterChange?.(filter.key, v === '' ? undefined : v)
                        }
                      >
                        <DropdownMenuRadioItem value="">Todos</DropdownMenuRadioItem>
                        {filter.options.map((opt) => (
                          <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })
            : null}
        </div>
      ) : null}

      {bulkActions && bulkActions.length > 0 && onBulkAction ? (
        <BulkActionsBar
          selectedCount={selectedRows.length}
          selectedRows={selectedRows}
          actions={bulkActions}
          onAction={onBulkAction}
          onClear={() => setRowSelection({})}
        />
      ) : null}

      <div
        ref={scrollRef}
        className="bg-background relative max-h-[600px] overflow-auto rounded-md border"
      >
        <table className="w-full border-collapse">
          {renderHeader()}
          {renderBodyRows()}
        </table>
      </div>

      {pagination ? (
        <DataTablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
        />
      ) : null}
    </div>
  );
}

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: DataTablePaginationProps): ReactNode {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Janela de paginas: 1 ... (page-1) page (page+1) ... totalPages
  const pages: number[] = [];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, page + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs">
        {total === 0
          ? '0 itens'
          : `Pagina ${page} de ${totalPages} — ${total} ${total === 1 ? 'item' : 'itens'}`}
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={!canPrev}
              className={cn(!canPrev && 'pointer-events-none opacity-50')}
              onClick={(e) => {
                e.preventDefault();
                if (canPrev) onPageChange(page - 1);
              }}
            />
          </PaginationItem>
          {pages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(p);
                }}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={!canNext}
              className={cn(!canNext && 'pointer-events-none opacity-50')}
              onClick={(e) => {
                e.preventDefault();
                if (canNext) onPageChange(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export { DataTablePro };
export type { DataTableProProps } from './types';
