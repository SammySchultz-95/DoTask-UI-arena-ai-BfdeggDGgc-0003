'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Database, XCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  backupApi,
  serverConfigApi,
  type PendingClientResponse,
  type PendingClientsQueryParams,
} from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { canManage, canWrite } from '@/lib/auth/roles';
import { formatDateTime } from '@/lib/format';
import { errorMessage, useToast } from '@/components/ui/toast';
import { BackupDialog } from '@/components/backup/backup-dialog';
import { Split } from '@/components/split/split';
import { CopyableValue } from '@/components/ui/copyable-value';
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
  const isSuperadmin = canManage(role);
  const toast = useToast();
  const [showBackup, setShowBackup] = useState(false);

  const backupMutation = useMutation({
    mutationFn: (params: { password: string } & Record<string, string | undefined>) =>
      backupApi.pendingClients(params),
    onSuccess: () => {
      toast.success('Pending clients backup downloaded.');
      setShowBackup(false);
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not get the backup.')),
  });

  const BACKUP_FILTER_FIELDS: FilterField[] = [
    { kind: 'text', name: 'client_id', label: 'Client ID (exact)' },
    { kind: 'text', name: 'client_id_contains', label: 'Client ID contains' },
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
    { kind: 'numberRange', label: 'Requests count', min: 'requests_count_min', max: 'requests_count_max' },
  ];

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>({ sortBy: 'last_request_time', sortDir: 'desc' });
  const [filters, setFilters] = useState<FilterValues>({});
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<PendingClientResponse | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingClientResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
  const selected = pending.find((row) => row.client_id === selectedId) ?? null;

  const columns = useMemo<Column<PendingClientResponse>[]>(
    () => [
      {
        key: 'client_id',
        header: 'Client ID',
        render: (row) =>
          row.client_id ? (
            <CopyableValue value={row.client_id} className="font-mono text-xs text-neon-300" />
          ) : (
            '—'
          ),
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
        {isSuperadmin ? (
          <Button variant="secondary" size="sm" onClick={() => setShowBackup(true)}>
            <Database size={14} />
            Backup
          </Button>
        ) : null}
      </PageHeader>

      <Split storageKey="pending-clients" defaultRight={380}>
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
            onRowClick={(row) => setSelectedId(row.client_id ?? null)}
            isSelected={(row) => row.client_id === selectedId}
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

      {/* Right: all info of the selected pending client */}
      <section className="panel h-fit p-4">
        <h2 className="mb-3 text-sm font-semibold text-fog">Pending client</h2>
        {selected ? (
          <PendingClientInfoPanel client={selected} />
        ) : (
          <p className="py-8 text-center text-xs text-fog-faint">
            Select a pending client on the left to see its details.
          </p>
        )}
      </section>
      </Split>

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

      <BackupDialog
        open={showBackup}
        title="Backup pending clients"
        description="Downloads a file with the selected pending clients from the server. Only superadmins can get backups."
        filterFields={BACKUP_FILTER_FIELDS}
        downloading={backupMutation.isPending}
        onClose={() => setShowBackup(false)}
        onDownload={(params) => backupMutation.mutate(params)}
      />

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

function PendingClientInfoPanel({ client }: { client: PendingClientResponse }) {
  const ipStack = client.client_ip_stack ?? [];
  return (
    <div className="space-y-4">
      <dl className="space-y-2.5 rounded-lg border border-ink-600 bg-ink-850/70 p-3 text-xs">
        <InfoRow
          label="Client ID"
          value={<span className="font-mono text-neon-300">{client.client_id ?? '—'}</span>}
        />
        <InfoRow label="First request" value={formatDateTime(client.first_request_time)} />
        <InfoRow label="Last request" value={formatDateTime(client.last_request_time)} />
        <InfoRow
          label="Requests count"
          value={<span className="font-mono">{client.requests_count ?? 0}</span>}
        />
      </dl>

      <div>
        <p className="label-base">Client IP stack ({ipStack.length})</p>
        {ipStack.length === 0 ? (
          <p className="text-xs text-fog-faint">No IP recorded yet.</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {ipStack.map((ip, index) => (
              <li
                key={`${ip}-${index}`}
                className="flex items-center justify-between rounded-md border border-ink-600 bg-ink-900 px-2.5 py-1.5"
              >
                <span className="font-mono text-xs">{ip}</span>
                {index === 0 ? (
                  <span className="rounded-full bg-neon-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neon-300">
                    latest
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">
        {label}
      </dt>
      <dd className="min-w-0 break-all text-right">{value}</dd>
    </div>
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
  const [waitTime, setWaitTime] = useState('');
  const [waitTime2, setWaitTime2] = useState('');
  const [error, setError] = useState<string | null>(null);

  // New clients start with the server-config default wait times.
  const serverConfig = useQuery({
    queryKey: ['server-config'],
    queryFn: serverConfigApi.get,
    staleTime: 60_000,
  });
  const waitTouched = useRef(false);
  const wait2Touched = useRef(false);

  useEffect(() => {
    const config = serverConfig.data;
    if (!config) return;
    if (!waitTouched.current) {
      setWaitTime((current) => current || String(config.default_response_wait_time));
    }
    if (!wait2Touched.current) {
      setWaitTime2((current) => current || String(config.default_response_wait_time_2));
    }
  }, [serverConfig.data]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsedWait = Number(waitTime);
    const parsedWait2 = Number(waitTime2);
    if (!clientName.trim()) {
      setError('Client name is required.');
      return;
    }
    if (
      waitTime === '' ||
      waitTime2 === '' ||
      !Number.isInteger(parsedWait) ||
      !Number.isInteger(parsedWait2)
    ) {
      setError('Wait times must be whole numbers (milliseconds).');
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
          <Field label="Wait time (ms)" htmlFor="pc-wait">
            <Input
              id="pc-wait"
              type="number"
              min={0}
              step={1}
              value={waitTime}
              placeholder={serverConfig.isLoading ? '…' : 'default'}
              onChange={(event) => {
                waitTouched.current = true;
                setWaitTime(event.target.value);
              }}
            />
          </Field>
          <Field label="Wait time 2 (ms)" htmlFor="pc-wait2">
            <Input
              id="pc-wait2"
              type="number"
              min={0}
              step={1}
              value={waitTime2}
              placeholder={serverConfig.isLoading ? '…' : 'default'}
              onChange={(event) => {
                wait2Touched.current = true;
                setWaitTime2(event.target.value);
              }}
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
