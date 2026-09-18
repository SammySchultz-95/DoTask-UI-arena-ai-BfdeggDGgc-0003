'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, ListTodo } from 'lucide-react';
import type { TaskAdminResponse, TasksQueryParams } from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { canWrite } from '@/lib/auth/roles';
import { formatDateTime, truncate } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { FilterBar, buildFilterParams, type FilterField, type FilterValues } from '@/components/filter-bar/filter-bar';
import { SearchBox } from '@/components/filter-bar/search-box';
import { SortControl, type SortState } from '@/components/filter-bar/sort-control';
import { StatusBadge } from '@/components/ui/badge';
import { useClientsQuery } from '@/features/clients/hooks';
import { AddTaskForm } from './add-task-form';
import { TaskDetailPanel } from './task-detail-panel';
import { useTasksQuery } from './hooks';

const SORT_OPTIONS = [
  { value: 'creation_time', label: 'creation_time' },
  { value: 'task_id', label: 'task_id' },
  { value: 'task_type_id', label: 'task_type_id' },
  { value: 'client_id', label: 'client_id' },
  { value: 'status', label: 'status' },
  { value: 'send_time', label: 'send_time' },
  { value: 'response_time', label: 'response_time' },
  { value: 'wait_time', label: 'wait_time' },
  { value: 'wait_time_2', label: 'wait_time_2' },
  { value: 'schedule', label: 'schedule' },
  { value: 'creator', label: 'creator' },
];

const TASK_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'scheduled' },
  { value: 'not_sent', label: 'not_sent' },
  { value: 'sent', label: 'sent' },
  { value: 'completed', label: 'completed' },
];

const MAIN_FILTERS: FilterField[] = [
  { kind: 'select', name: 'status', label: 'Status', options: TASK_STATUS_OPTIONS },
  { kind: 'text', name: 'task_type_name', label: 'Task type' },
  { kind: 'text', name: 'creator', label: 'Creator' },
  { kind: 'boolean', name: 'has_schedule', label: 'Scheduled' },
  { kind: 'boolean', name: 'has_response', label: 'Has response' },
];

const ADVANCED_FILTERS: FilterField[] = [
  { kind: 'text', name: 'task_id', label: 'Task ID (exact)' },
  { kind: 'text', name: 'task_type_id', label: 'Task type ID' },
  { kind: 'text', name: 'client_id', label: 'Client ID' },
  { kind: 'text', name: 'client_pull_ip', label: 'Pull IP' },
  { kind: 'text', name: 'client_response_ip', label: 'Response IP' },
  { kind: 'text', name: 'response_contains', label: 'Response contains' },
  { kind: 'text', name: 'context_contains', label: 'Context contains' },
  { kind: 'numberRange', label: 'Wait time', exact: 'wait_time', min: 'wait_time_min', max: 'wait_time_max' },
  { kind: 'numberRange', label: 'Wait time 2', exact: 'wait_time_2', min: 'wait_time_2_min', max: 'wait_time_2_max' },
  { kind: 'dateRange', label: 'Created', after: 'createdAfter', before: 'createdBefore' },
  { kind: 'dateRange', label: 'Send time', after: 'send_time_after', before: 'send_time_before' },
  {
    kind: 'dateRange',
    label: 'Response time',
    after: 'response_time_after',
    before: 'response_time_before',
  },
  { kind: 'dateRange', label: 'Schedule', after: 'schedule_after', before: 'schedule_before' },
];

const ALL_FILTER_FIELDS = [...MAIN_FILTERS, ...ADVANCED_FILTERS];

export function ClientTasksPage() {
  return (
    <Suspense fallback={null}>
      <ClientTasksPageInner />
    </Suspense>
  );
}

function ClientTasksPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = useAuth();
  const writable = canWrite(role);

  /** Header client scope, synced with the ?client_id= query param. */
  const scopedClientId = searchParams.get('client_id') ?? '';

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>({ sortBy: 'creation_time', sortDir: 'desc' });
  const [filters, setFilters] = useState<FilterValues>({});
  const [search, setSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  // Client dropdown options (paginated list of registered clients).
  const clientsQuery = useClientsQuery({ page: 1, pageSize: 200, sortBy: 'client_name', sortDir: 'asc' });
  const clientOptions = (clientsQuery.data?.items ?? []).map((client) => ({
    value: client.client_id ?? '',
    label: client.client_name
      ? `${client.client_id} — ${client.client_name}`
      : client.client_id ?? '',
  }));

  const queryParams = useMemo<TasksQueryParams>(
    () => ({
      page,
      pageSize,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
      ...(scopedClientId ? { client_id: scopedClientId } : {}),
      ...(buildFilterParams(ALL_FILTER_FIELDS, filters) as Partial<TasksQueryParams>),
    }),
    [page, pageSize, sort, filters, scopedClientId],
  );

  const query = useTasksQuery(queryParams, { search, paused: formDirty });
  const tasks = query.data?.items ?? [];
  const selectedTask = tasks.find((task) => task.task_id === selectedTaskId) ?? null;

  function setScopedClient(clientId: string) {
    setPage(1);
    setSelectedTaskId(null);
    const params = new URLSearchParams(searchParams.toString());
    if (clientId) params.set('client_id', clientId);
    else params.delete('client_id');
    router.replace(`/client-tasks${params.toString() ? `?${params}` : ''}`);
  }

  const columns = useMemo<Column<TaskAdminResponse>[]>(
    () => [
      {
        key: 'task_id',
        header: 'Task ID',
        render: (row) => <span className="font-mono text-xs text-neon-300">{truncate(row.task_id, 18) || '—'}</span>,
      },
      {
        key: 'client_id',
        header: 'Client',
        render: (row) => <span className="font-mono text-xs">{row.client_id ?? '—'}</span>,
      },
      { key: 'task_type_name', header: 'Type', render: (row) => row.task_type_name ?? '—' },
      { key: 'creator', header: 'Creator', render: (row) => <span className="text-xs text-fog-dim">{row.creator ?? '—'}</span> },
      { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
      {
        key: 'wait_time',
        header: 'Wait',
        className: 'text-right',
        render: (row) => (
          <span className="font-mono text-xs text-fog-dim">
            {row.wait_time} / {row.wait_time_2}
          </span>
        ),
      },
      {
        key: 'creation_time',
        header: 'Created',
        render: (row) => <span className="whitespace-nowrap text-xs text-fog-dim">{formatDateTime(row.creation_time)}</span>,
      },
      {
        key: 'schedule',
        header: 'Schedule',
        render: (row) => <span className="whitespace-nowrap text-xs text-fog-dim">{formatDateTime(row.schedule)}</span>,
      },
      {
        key: 'send_time',
        header: 'Sent',
        render: (row) => <span className="whitespace-nowrap text-xs text-fog-dim">{formatDateTime(row.send_time)}</span>,
      },
      {
        key: 'response_time',
        header: 'Responded',
        render: (row) => <span className="whitespace-nowrap text-xs text-fog-dim">{formatDateTime(row.response_time)}</span>,
      },
      {
        key: 'response',
        header: 'Response',
        render: (row) => <span className="text-xs text-fog-dim">{truncate(row.response, 40) || '—'}</span>,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Client Tasks"
        subtitle="Tasks queued for clients — create, inspect and patch them."
        onReload={() => void query.refetch()}
        reloading={query.isFetching}
      >
        {/* Client scope dropdown — syncs ?client_id= */}
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-faint">
            Client
          </label>
          <select
            value={scopedClientId}
            onChange={(event) => setScopedClient(event.target.value)}
            className="h-8 max-w-[240px] rounded-lg border border-ink-500 bg-ink-900 px-2 text-xs text-fog outline-none focus:border-neon-500/60"
          >
            <option value="">— none —</option>
            {clientOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <SearchBox
          value={search}
          placeholder="Search tasks… (Enter)"
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {/* Add task bar */}
          {writable ? (
            <div className="panel overflow-hidden">
              <button
                onClick={() => setShowAddTask((value) => !value)}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-neon-300 transition hover:bg-ink-750"
              >
                <ListTodo size={15} />
                Add task
                {scopedClientId ? (
                  <span className="font-mono text-xs text-fog-dim">for {scopedClientId}</span>
                ) : null}
                {showAddTask ? (
                  <ChevronUp size={15} className="ml-auto" />
                ) : (
                  <ChevronDown size={15} className="ml-auto" />
                )}
              </button>
              {showAddTask ? (
                <div className="border-t border-ink-600 p-4">
                  <AddTaskForm
                    clientId={scopedClientId}
                    clientIdLocked={Boolean(scopedClientId)}
                    compact
                    onCreated={() => setShowAddTask(false)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

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
            <DataTable<TaskAdminResponse>
              columns={columns}
              rows={tasks}
              rowKey={(row) => row.task_id ?? ''}
              loading={query.isLoading}
              page={page}
              pageSize={pageSize}
              totalCount={query.data?.totalCount ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPage(1);
                setPageSize(size);
              }}
              onRowClick={(row) => setSelectedTaskId(row.task_id ?? null)}
              isSelected={(row) => row.task_id === selectedTaskId}
              emptyMessage={
                query.isError
                  ? query.error instanceof Error
                    ? query.error.message
                    : 'Failed to load tasks.'
                  : 'No tasks match the current view.'
              }
            />
          </div>
        </div>

        <section className="panel h-fit p-4">
          <h2 className="mb-3 text-sm font-semibold text-fog">Task detail</h2>
          {selectedTask ? (
            <TaskDetailPanel
              key={selectedTask.task_id}
              task={selectedTask}
              readonly={!writable}
              onDirtyChange={setFormDirty}
            />
          ) : (
            <p className="py-8 text-center text-xs text-fog-faint">
              Select a task to see its full response and details.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
