'use client';

/**
 * Paginated table shared by every list page: auto-numbered rows, configurable
 * columns, row-click selection and optional per-row action cell.
 */
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: T) => void;
  isSelected?: (row: T) => boolean;
  /** Extra per-row action cell (stopPropagation is applied automatically). */
  actions?: (row: T) => ReactNode;
  /** Render an expanded sub-row beneath the given row. */
  renderExpanded?: (row: T) => ReactNode;
  emptyMessage?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  isSelected,
  actions,
  renderExpanded,
  emptyMessage = 'Nothing here yet.',
}: DataTableProps<T>) {
  const items = rows ?? [];
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-auto">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-fog-dim">
            <Spinner className="h-4 w-4" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-fog-faint">{emptyMessage}</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-ink-850/95 backdrop-blur">
              <tr className="border-b border-ink-500">
                <th className="th-base w-10 text-right">#</th>
                {columns.map((column) => (
                  <th key={column.key} className={`th-base ${column.className ?? ''}`}>
                    {column.header}
                  </th>
                ))}
                {actions ? <th className="th-base w-1 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((row, index) => {
                const selected = isSelected?.(row) ?? false;
                return (
                  <RowGroup
                    key={rowKey(row)}
                    selected={selected}
                    clickable={Boolean(onRowClick)}
                  >
                    <tr
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={`border-b border-ink-600/60 transition ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${
                        selected
                          ? 'bg-neon-500/[0.07] shadow-[inset_2px_0_0_0_theme(colors.neon.500)]'
                          : 'hover:bg-ink-750'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-fog-faint">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-3 py-2.5 align-middle ${column.className ?? ''}`}
                        >
                          {column.render(row, index)}
                        </td>
                      ))}
                      {actions ? (
                        <td
                          className="px-3 py-2 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {actions(row)}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                    {renderExpanded && selected ? (
                      <tr className="border-b border-ink-600/60 bg-ink-850/70">
                        <td colSpan={columns.length + 1 + (actions ? 1 : 0) + 1}>
                          {renderExpanded(row)}
                        </td>
                      </tr>
                    ) : null}
                  </RowGroup>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-500 px-3 py-2.5 text-xs text-fog-dim">
        <div className="flex items-center gap-2">
          {loading && items.length > 0 ? <Spinner className="h-3.5 w-3.5" /> : null}
          <span>
            {totalCount === 0
              ? '0 rows'
              : `${firstRow}–${lastRow} of ${totalCount.toLocaleString()}`}
          </span>
          {onPageSizeChange ? (
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-md border border-ink-500 bg-ink-900 px-1.5 py-1 text-xs text-fog outline-none focus:border-neon-500/60"
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded-md p-1.5 transition hover:bg-ink-700 hover:text-fog disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="px-1.5 font-mono">
            {page} / {totalPages}
          </span>
          <button
            className="rounded-md p-1.5 transition hover:bg-ink-700 hover:text-fog disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function RowGroup({
  children,
  selected,
  clickable,
}: {
  children: ReactNode;
  selected: boolean;
  clickable: boolean;
}) {
  void selected;
  void clickable;
  return <>{children}</>;
}
