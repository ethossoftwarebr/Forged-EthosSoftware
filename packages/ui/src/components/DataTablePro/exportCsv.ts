import type { DataTableColumn } from './types';

function escape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // RFC 4180: campos com aspas/virgula/newline precisam ser quoted; aspas dobradas internas.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Exporta as linhas como CSV (RFC 4180) e dispara download via Blob.
 *
 * Funcao pura sem dependencias externas. Apenas chame em handlers do client
 * (ex: `onClick`); requer `document` e `URL.createObjectURL`.
 */
export function exportCsv<T>(
  rows: T[],
  columns: Pick<DataTableColumn<T>, 'key' | 'label'>[],
  filename = 'export.csv',
): void {
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escape((row as Record<string, unknown>)[c.key])).join(','))
    .join('\n');
  const csv = body ? `${header}\n${body}` : header;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
