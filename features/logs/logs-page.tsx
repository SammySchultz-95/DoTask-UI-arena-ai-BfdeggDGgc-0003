'use client';

import { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import type { LogEntryResponse, LogsQueryParams } from '@/lib/api-client/endpoints';
import { formatDateTime } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { logsApi } from '@/lib/api-client/endpoints';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { FilterBar, buildFilterParams, type FilterField, type FilterValues } from '@/components/filter-bar/filter-bar';
import { SearchBox } from '@/components/filter-bar/search-box';
import { SortControl, type SortState } from '@/components/filter-bar/sort-control';
import { StatusBadge } from '@/components/ui/badge';

const SORT_OPTIONS = [
  { value: 'time', label: 'time' },
  { value: 'log_id', label: 'log_id' },
  { value: 'actor', label: 'actor' },
  { value: 'level', label: 'level' },
];

const FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'actor_contains', label: 'Actor contains' },
  { kind: 'text', name: 'level', label: 'Level', placeholder: 'e.g. information' },
  { kind: 'dateRange', label: 'Time', after: 'timeAfter', before: 'timeBefore' },
];

const ADVANCED_FILTER_FIELDS: FilterField[] = [
  { kind: 'numberRange', label: 'Log ID', exact: 'log_id', min: 'log_id_min', max: 'log_id_max' },
  { kind: 'text', name: 'actor', label: 'Actor (exact)' },
];

const ALL_FIELDS = [...FILTER_FIELDS, ...ADVANCED_FILTER_FIELDS];

export function LogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>({ sortBy: 'time', sortDir: 'desc' });
  const [filters, setFilters] = useState<FilterValues>({});
  /** Search box maps to `context` — partial match, doubles as the search. */
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const queryParams = useMemo<LogsQueryParams>(
    () => ({
      page,
      pageSize,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
      ...(search ? { context: search } : {}),
      ...(buildFilterParams(ALL_FIELDS, filters) as Partial<LogsQueryParams>),
    }),
    [page, pageSize, sort, filters, search],
  );

  const query = useLiveQuery({
    queryKey: ['logs', queryParams],
    queryFn: () => logsApi.query(queryParams),
  });
  const logs = query.data?.items ?? [];
  const selected = logs.find((entry) => entry.log_id === selectedId) ?? null;

  const columns = useMemo<Column<LogEntryResponse>[]>(
    () => [
      {
        key: 'log_id',
        header: 'ID',
        className: 'w-20 text-right',
        render: (row) => <span className="font-mono text-xs text-fog-dim">{row.log_id}</span>,
      },
      {
        key: 'time',
        header: 'Time',
        render: (row) => <span className="whitespace-nowrap text-xs">{formatDateTime(row.time)}</span>,
      },
      { key: 'actor', header: 'Actor', render: (row) => <span className="font-mono text-xs text-neon-300">{row.actor ?? '—'}</span> },
      { key: 'level', header: 'Level', render: (row) => <StatusBadge value={row.level} /> },
      {
        key: 'context',
        header: 'Context',
        render: (row) => (
          <span className="block max-w-[420px] truncate text-xs text-fog-dim">{row.context ?? '—'}</span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Logs"
        subtitle="Audit trail of everything that happened on the server."
        onReload={() => void query.refetch()}
        reloading={query.isFetching}
      >
        <SearchBox
          value={search}
          placeholder="Search context… (Enter)"
          onSearch={(q) => {
            setPage(1);
            setSearch(q);
          }}
        />
        <SortControl
          value={sort}
          options={SORT_OPTIONS}
          onChange={(next) => {
            setPage(1);
            setSort(next);
          }}
        />
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="panel p-4">
            <FilterBar
              fields={FILTER_FIELDS}
              advanced={ADVANCED_FILTER_FIELDS}
              values={filters}
              onChange={(next) => {
                setPage(1);
                setFilters(next);
              }}
              onClear={() => {
                setPage(1);
                setFilters({});
              }}
            />
          </div>

          <div className="panel min-h-[420px] overflow-hidden">
            <DataTable<LogEntryResponse>
              columns={columns}
              rows={logs}
              rowKey={(row) => String(row.log_id)}
              loading={query.isLoading}
              page={page}
              pageSize={pageSize}
              totalCount={query.data?.totalCount ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPage(1);
                setPageSize(size);
              }}
              onRowClick={(row) => setSelectedId(row.log_id ?? null)}
              isSelected={(row) => (row.log_id ?? null) === selectedId}
              emptyMessage={
                query.isError
                  ? query.error instanceof Error
                    ? query.error.message
                    : 'Failed to load logs.'
                  : 'No log entries match the current view.'
              }
            />
          </div>
        </div>

        <section className="panel h-fit p-4">
          <div className="mb-3 flex items-center gap-2">
            <ScrollText size={15} className="text-neon-400" />
            <h2 className="text-sm font-semibold text-fog">Log detail</h2>
          </div>
          {selected ? (
            <div className="space-y-3 text-xs">
              <dl className="space-y-1.5 rounded-lg border border-ink-600 bg-ink-850/70 p-3">
                <div className="flex justify-between">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">Log ID</dt>
                  <dd className="font-mono">{selected.log_id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">Actor</dt>
                  <dd className="font-mono">{selected.actor ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">Time</dt>
                  <dd>{formatDateTime(selected.time)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">Level</dt>
                  <dd><StatusBadge value={selected.level} /></dd>
                </div>
              </dl>
              <div>
                <p className="label-base">Full context</p>
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-ink-600 bg-ink-900 p-3 font-mono text-xs leading-relaxed text-fog-dim">
                  {selected.context || 'No context.'}
                </pre>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-fog-faint">
              Select a log entry to read its full context.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
