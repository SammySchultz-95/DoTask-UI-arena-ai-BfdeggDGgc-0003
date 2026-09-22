'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type {
  PendingClientResponse,
  PendingClientsQueryParams,
} from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { canWrite } from '@/lib/auth/roles';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { FilterBar, buildFilterParams, type FilterField, type FilterValues } from '@/components/filter-bar/filter-bar';
import { SearchBox } from '@/components/filter-bar/search-box';
import { SortControl, type SortState } from '@/components/filter-bar/sort-control';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { Field, Input } from '@/components/ui/inputs';
import {
  useConfirmPendingClient,
  usePendingClientsQuery,
  useRejectPendingClient,
} from './hooks';

const SORT_OPTIONS = [
  { value: 'last_request_time', label: 'last_request_time' },
  { value: 'first_request_time', label: 'first_request_time' },
  { value: 'client_id', label: 'client_id' },
  { value: 'requests_count', label: 'requests_count' },
];

const FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'client_id', label: 'Client ID' },
  {
    kind: 'text',
    name: 'has_ip',
    label: 'Has IP',
    placeholder: 'e.g. 192.168.1.5 or 10.0.0.0/24',
  },
  {
    kind: 'dateRange',
    label: 'First request',
    after: 'first_request_time_after',
    before: 'first_request_time_before',
  },
  {
    kind: 'dateRange',
    label: 'Last request',
    after: 'last_request_time_after',
    before: 'last_request_time_before',
  },
];

const ADVANCED_FILTER_FIELDS: FilterField[] = [
  {
    kind: 'numberRange',
    label: 'Requests count',
    exact: 'requests_count',
    min: 'requests_count_min',
    max: 'requests_count_max',
  },
];

const ALL_FIELDS = [...FILTER_FIELDS, ...ADVANCED_FILTER_FIELDS];

export function PendingClientsPage() {
  const { role } = useAuth();
  const writable = canWrite(role);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>({ sortBy: 'last_request_time', sortDir: 'desc' });
  const [filters, setFilters] = useState<FilterValues>({});
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<PendingClientResponse | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingClientResponse | null>(null);

  const confirmClient = useConfirmPendingClient();
  const rejectClient = useRejectPendingClient();

  const queryParams = useMemo<PendingClientsQueryParams>(
    () => ({
      page,
      pageSize,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
      ...(buildFilterParams(ALL_FIELDS, filters) as Partial<PendingClientsQueryParams>),
    }),
    [page, pageSize, sort, filters],
  );

  const query = usePendingClientsQuery(queryParams, { search });
  const pending = query.data?.items ?? [];

  const columns = useMemo<Column<PendingClientResponse>[]>(
    () => [
      {
        key: 'client_id',
        header: 'Client ID',
        render: (row) => <span className="font-mono text-xs text-neon-300">{row.client_id ?? '—'}</span>,
      },
      {
        key: 'latest_ip',
        header: 'Latest IP',
        render: (row) => <span className="font-mono text-xs text-fog-dim">{row.client_ip_stack?.[0] ?? '—'}</span>,
      },
      {
        key: 'first_request_time',
        header: 'First request',
        render: (row) => <span className="whitespace-nowrap text-xs text-fog-dim">{formatDateTime(row.first_request_time)}</span>,
      },
      {
        key: 'last_request_time',
        header: 'Last request',
        render: (row) => <span className="whitespace-nowrap text-xs">{formatDateTime(row.last_request_time)}</span>,
      },
      {
        key: 'requests_count',
        header: 'Requests',
        className: 'text-right',
        render: (row) => <span className="font-mono text-xs">{row.requests_count}</span>,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Pending Clients"
        subtitle="Unregistered clients requesting to join — confirm or reject them."
        onReload={() => void query.refetch()}
        reloading={query.isFetching}
      >
        <SearchBox
          value={search}
          placeholder="Search pending clients… (Enter)"
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
          <DataTable<PendingClientResponse>
            columns={columns}
            rows={pending}
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
            emptyMessage={
              query.isError
                ? query.error instanceof Error
                  ? query.error.message
                  : 'Failed to load pending clients.'
                : 'No pending clients right now.'
            }
            actions={
              writable
                ? (row) => (
                    <>
                      <Button variant="outline" size="xs" onClick={() => setConfirmTarget(row)}>
                        <CheckCircle2 size={13} />
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => setRejectTarget(row)}
                      >
                        <XCircle size={13} />
                        Reject
                      </Button>
                    </>
                  )
                : undefined
            }
          />
        </div>
      </div>

      {confirmTarget ? (
        <ConfirmPendingClientModal
          target={confirmTarget}
          loading={confirmClient.isPending}
          onClose={() => setConfirmTarget(null)}
          onSubmit={(body) => {
            if (!confirmTarget.client_id) return;
            confirmClient.mutate(
              { clientId: confirmTarget.client_id, body },
              { onSuccess: () => setConfirmTarget(null) },
            );
          }}
        />
      ) : null}

      <ConfirmDialog
        open={rejectTarget !== null}
        title="Reject pending client"
        confirmLabel="Reject"
        body={
          <>
            Reject <span className="font-mono text-fog">{rejectTarget?.client_id}</span>? Its
            pending registration will be deleted and it must request again.
          </>
        }
        loading={rejectClient.isPending}
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => {
          if (!rejectTarget?.client_id) return;
          rejectClient.mutate(rejectTarget.client_id, {
            onSuccess: () => setRejectTarget(null),
          });
        }}
      />
    </>
  );
}

function ConfirmPendingClientModal({
  target,
  loading,
  onClose,
  onSubmit,
}: {
  target: PendingClientResponse;
  loading: boolean;
  onClose: () => void;
  onSubmit: (body: { client_name: string; wait_time: number; wait_time_2: number }) => void;
}) {
  const [clientName, setClientName] = useState(target.client_id ?? '');
  const [waitTime, setWaitTime] = useState('60');
  const [waitTime2, setWaitTime2] = useState('60');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsedWait = Number(waitTime);
    const parsedWait2 = Number(waitTime2);
    if (!clientName.trim()) {
      setError('Client name is required.');
      return;
    }
    if (Number.isNaN(parsedWait) || Number.isNaN(parsedWait2)) {
      setError('Wait times must be numbers.');
      return;
    }
    onSubmit({
      client_name: clientName.trim(),
      wait_time: parsedWait,
      wait_time_2: parsedWait2,
    });
  }

  return (
    <Modal open title={`Confirm client ${target.client_id ?? ''}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs leading-relaxed text-fog-dim">
          Registering <span className="font-mono text-neon-300">{target.client_id}</span> as a new
          client. It will appear in the Clients list immediately.
        </p>
        <Field label="Client name" htmlFor="pc-name">
          <Input
            id="pc-name"
            value={clientName}
            autoFocus
            onChange={(event) => setClientName(event.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Wait time (s)" htmlFor="pc-wait">
            <Input
              id="pc-wait"
              type="number"
              min={0}
              value={waitTime}
              onChange={(event) => setWaitTime(event.target.value)}
            />
          </Field>
          <Field label="Wait time 2 (s)" htmlFor="pc-wait2">
            <Input
              id="pc-wait2"
              type="number"
              min={0}
              value={waitTime2}
              onChange={(event) => setWaitTime2(event.target.value)}
            />
          </Field>
        </div>
        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Confirm client
          </Button>
        </div>
      </form>
    </Modal>
  );
}
