'use client';

import { useMemo, useState } from 'react';
import { Database, ScrollText } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { backupApi, type LogEntryResponse, type LogsQueryParams } from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { canManage } from '@/lib/auth/roles';
import { formatDateTime } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { logsApi } from '@/lib/api-client/endpoints';
import { errorMessage, useToast } from '@/components/ui/toast';
import { BackupDialog } from '@/components/backup/backup-dialog';
import { PageHeader } from '@/components/page-header';
import { Split } from '@/components/split/split';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { FilterBar, buildFilterParams, type FilterField, type FilterValues } from '@/components/filter-bar/filter-bar';
import { SearchBox } from '@/components/filter-bar/search-box';
import { SortControl, type SortState } from '@/components/filter-bar/sort-control';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SORT_OPTIONS = [
  { value: 'time', label: 'time' },
  { value: 'log_id', label: 'log_id' },
  { value: 'actor', label: 'actor' },
  { value: 'actor_ip', label: 'actor_ip' },
  { value: 'level', label: 'level' },
];

const FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'actor_contains', label: 'Actor contains' },
  {
    kind: 'text',
    name: 'actor_ip',
    label: 'Actor IP',
    placeholder: 'e.g. 192.168.1.5 or 10.0.0.0/24',
  },
  { kind: 'text', name: 'level', label: 'Level', placeholder: 'e.g. information' },
  { kind: 'dateRange', label: 'Time', after: 'timeAfter', before: 'timeBefore' },
];

const ADVANCED_FILTER_FIELDS: FilterField[] = [
  { kind: 'numberRange', label: 'Log ID', exact: 'log_id', min: 'log_id_min', max: 'log_id_max' },
  { kind: 'text', name: 'actor', label: 'Actor (exact)' },
];

const ALL_FIELDS = [...FILTER_FIELDS, ...ADVANCED_FILTER_FIELDS];

const LOG_LEVEL_OPTIONS = [
  { value: 'info', label: 'info' },
  { value: 'warning', label: 'warning' },
  { value: 'error', label: 'error' },
];

/** All documented filter fields of GET /admin/backup/logs. */
const BACKUP_FILTER_FIELDS: FilterField[] = [
  { kind: 'numberRange', label: 'Log ID', exact: 'log_id', min: 'log_id_min', max: 'log_id_max' },
  { kind: 'text', name: 'actor', label: 'Actor (exact)' },
  { kind: 'text', name: 'actor_contains', label: 'Actor contains' },
  {
    kind: 'text',
    name: 'actor_ip',
    label: 'Actor IP',
    placeholder: 'e.g. 192.168.1.5 or 10.0.0.0/24',
  },
  { kind: 'select', name: 'level', label: 'Level', options: LOG_LEVEL_OPTIONS },
  { kind: 'text', name: 'context', label: 'Context contains' },
  { kind: 'dateRange', label: 'Time', after: 'timeAfter', before: 'timeBefore' },
];

export function LogsPage() {
  const { role } = useAuth();
  const isSuperadmin = canManage(role);
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>({ sortBy: 'time', sortDir: 'desc' });
  const [filters, setFilters] = useState<FilterValues>({});
  /** Search box maps to `context` — partial match, doubles as the search. */
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showBackup, setShowBackup] = useState(false);

  const backupMutation = useMutation({
    mutationFn: (params: { password: string } & Record<string, string | undefined>) =>
      backupApi.logs(params),
    onSuccess: () => {
      toast.success('Logs backup downloaded.');
      setShowBackup(false);
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not get the backup.')),
  });

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
      {
        key: 'actor_ip',
        header: 'Actor IP',
        render: (row) => <span className="font-mono text-xs text-fog-dim">{row.actor_ip ?? '—'}</span>,
      },
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
        {isSuperadmin ? (
          <Button variant="secondary" size="sm" onClick={() => setShowBackup(true)}>
            <Database size={14} />
            Backup
          </Button>
        ) : null}
      </PageHeader>

      <Split storageKey="logs" defaultRight={380}>
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
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">Actor IP</dt>
                  <dd className="font-mono">{selected.actor_ip ?? '—'}</dd>
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
      </Split>

      <BackupDialog
        open={showBackup}
        title="Backup logs"
        description="Downloads a file with the selected audit log entries from the server. Only superadmins can get backups."
        filterFields={BACKUP_FILTER_FIELDS}
        sortByOptions={SORT_OPTIONS}
        downloading={backupMutation.isPending}
        onClose={() => setShowBackup(false)}
        onDownload={(params) => backupMutation.mutate(params)}
      />
    </>
  );
}
