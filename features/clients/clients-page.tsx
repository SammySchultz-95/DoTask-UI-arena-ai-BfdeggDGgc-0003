'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListTodo, MonitorSmartphone, Trash2 } from 'lucide-react';
import type { ClientResponse, ClientsQueryParams } from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { canWrite } from '@/lib/auth/roles';
import { formatDateTime, truncate } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { FilterBar, buildFilterParams, type FilterField, type FilterValues } from '@/components/filter-bar/filter-bar';
import { SearchBox } from '@/components/filter-bar/search-box';
import { SortControl, type SortState } from '@/components/filter-bar/sort-control';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AddTaskForm } from '@/features/tasks/add-task-form';
import { ClientInfoPanel } from './client-info-panel';
import { useClientsQuery, useDeleteClient } from './hooks';

const SORT_OPTIONS = [
  { value: 'creation_time', label: 'creation_time' },
  { value: 'client_id', label: 'client_id' },
  { value: 'client_name', label: 'client_name' },
  { value: 'last_check_in', label: 'last_check_in' },
  { value: 'status', label: 'status' },
  { value: 'wait_time', label: 'wait_time' },
  { value: 'wait_time_2', label: 'wait_time_2' },
  { value: 'requests_count', label: 'requests_count' },
  { value: 'last_max_wait_time', label: 'last_max_wait_time' },
  { value: 'online_status', label: 'online_status' },
];

const CLIENT_STATUS_OPTIONS = [
  { value: 'running', label: 'running' },
  { value: 'shutdown', label: 'shutdown' },
  { value: 'suspended', label: 'suspended' },
];

const ONLINE_STATUS_OPTIONS = [
  { value: 'online', label: 'online' },
  { value: 'offline', label: 'offline' },
];

const MAIN_FILTERS: FilterField[] = [
  { kind: 'select', name: 'status', label: 'Status', options: CLIENT_STATUS_OPTIONS },
  { kind: 'select', name: 'online_status', label: 'Online status', options: ONLINE_STATUS_OPTIONS },
  { kind: 'text', name: 'client_name_contains', label: 'Name contains' },
  {
    kind: 'text',
    name: 'has_ip',
    label: 'Has IP',
    placeholder: 'e.g. 192.168.1.5 or 10.0.0.0/24',
  },
  { kind: 'dateRange', label: 'Created', after: 'createdAfter', before: 'createdBefore' },
  {
    kind: 'dateRange',
    label: 'Last check-in',
    after: 'last_check_in_after',
    before: 'last_check_in_before',
  },
];

const ADVANCED_FILTERS: FilterField[] = [
  { kind: 'text', name: 'client_id', label: 'Client ID (exact)' },
  { kind: 'text', name: 'client_name', label: 'Client name (exact)' },
  { kind: 'numberRange', label: 'Wait time', exact: 'wait_time', min: 'wait_time_min', max: 'wait_time_max' },
  { kind: 'numberRange', label: 'Wait time 2', exact: 'wait_time_2', min: 'wait_time_2_min', max: 'wait_time_2_max' },
  {
    kind: 'numberRange',
    label: 'Last max wait time',
    min: 'last_max_wait_time_min',
    max: 'last_max_wait_time_max',
  },
  {
    kind: 'numberRange',
    label: 'Requests count',
    exact: 'requests_count',
    min: 'requests_count_min',
    max: 'requests_count_max',
  },
  { kind: 'boolean', name: 'has_checked_in', label: 'Has checked in' },
];

const ALL_FILTER_FIELDS = [...MAIN_FILTERS, ...ADVANCED_FILTERS];

export function ClientsPage() {
  const router = useRouter();
  const { role } = useAuth();
  const writable = canWrite(role);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>({ sortBy: 'creation_time', sortDir: 'desc' });
  const [filters, setFilters] = useState<FilterValues>({});
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientResponse | null>(null);

  const deleteClient = useDeleteClient();

  const queryParams = useMemo<ClientsQueryParams>(
    () => ({
      page,
      pageSize,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
      ...(buildFilterParams(ALL_FILTER_FIELDS, filters) as Partial<ClientsQueryParams>),
    }),
    [page, pageSize, sort, filters],
  );

  const query = useClientsQuery(queryParams, { search, paused: formDirty });
  const clients = query.data?.items ?? [];
  const selected = clients.find((client) => client.client_id === selectedId) ?? null;

  const columns = useMemo<Column<ClientResponse>[]>(
    () => [
      {
        key: 'client_id',
        header: 'Client ID',
        render: (row) => <span className="font-mono text-xs text-neon-300">{row.client_id ?? '—'}</span>,
      },
      { key: 'client_name', header: 'Name', render: (row) => row.client_name ?? '—' },
      {
        key: 'online_status',
        header: 'Online',
        render: (row) => <StatusBadge value={row.online_status} />,
      },
      {
        key: 'last_check_in',
        header: 'Last check-in',
        render: (row) => (
          <span className="whitespace-nowrap text-xs text-fog-dim">{formatDateTime(row.last_check_in)}</span>
        ),
      },
      { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
      {
        key: 'requests_count',
        header: 'Requests',
        className: 'text-right',
        render: (row) => <span className="font-mono text-xs">{row.requests_count}</span>,
      },
      {
        key: 'latest_ip',
        header: 'Latest IP',
        render: (row) => (
          <span className="font-mono text-xs text-fog-dim">{row.client_ip_stack?.[0] ?? '—'}</span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Registered clients polling for tasks."
        onReload={() => void query.refetch()}
        reloading={query.isFetching}
      >
        <SearchBox
          value={search}
          placeholder="Search clients… (Enter)"
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Left: table + filters */}
        <div className="space-y-4">
          <div className="panel p-4">
            <FilterBar
              fields={MAIN_FILTERS}
              advanced={ADVANCED_FILTERS}
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
            <DataTable<ClientResponse>
              columns={columns}
              rows={clients}
              rowKey={(row) => row.client_id ?? ''}
              loading={query.isLoading}
              page={page}
              pageSize={pageSize}
              totalCount={query.data?.totalCount ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPage(1);
                setPageSize(size);
              }}
              onRowClick={(row) => setSelectedId(row.client_id ?? null)}
              isSelected={(row) => row.client_id === selectedId}
              emptyMessage={
                query.isError
                  ? query.error instanceof Error
                    ? query.error.message
                    : 'Failed to load clients.'
                  : 'No clients match the current view.'
              }
              actions={(row) => (
                <>
                  <Button
                    variant="ghost"
                    size="xs"
                    title="View this client's tasks"
                    onClick={() =>
                      router.push(`/client-tasks?client_id=${encodeURIComponent(row.client_id ?? '')}`)
                    }
                  >
                    <ListTodo size={13} />
                    Tasks
                  </Button>
                  {writable ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      title="Delete client"
                      className="hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  ) : null}
                </>
              )}
            />
          </div>
        </div>

        {/* Right: edit client + add task */}
        <div className="space-y-4">
          <section className="panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <MonitorSmartphone size={15} className="text-neon-400" />
              <h2 className="text-sm font-semibold text-fog">Client Info</h2>
            </div>
            {selected ? (
              <ClientInfoPanel client={selected} readonly={!writable} onDirtyChange={setFormDirty} />
            ) : (
              <p className="py-8 text-center text-xs text-fog-faint">
                Select a client on the left to see its information.
              </p>
            )}
          </section>

          {writable ? (
            <section className="panel p-4">
              <div className="mb-3 flex items-center gap-2">
                <ListTodo size={15} className="text-neon-400" />
                <h2 className="text-sm font-semibold text-fog">Add task</h2>
              </div>
              {selected ? (
                <AddTaskForm clientId={selected.client_id ?? ''} />
              ) : (
                <p className="py-8 text-center text-xs text-fog-faint">
                  Select a client to add a task for it.
                </p>
              )}
            </section>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete client"
        body={
          <>
            Delete client{' '}
            <span className="font-mono text-fog">{deleteTarget?.client_id}</span>
            {deleteTarget?.client_name ? ` (${deleteTarget.client_name})` : ''}? This cannot be
            undone — the API has no conflict guard for this deletion.
          </>
        }
        loading={deleteClient.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget?.client_id) return;
          deleteClient.mutate(deleteTarget.client_id, {
            onSuccess: () => {
              if (selectedId === deleteTarget.client_id) setSelectedId(null);
              setDeleteTarget(null);
            },
          });
        }}
      />
    </>
  );
}
