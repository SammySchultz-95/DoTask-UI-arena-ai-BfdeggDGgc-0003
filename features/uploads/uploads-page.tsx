'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Copy, Database, Download, Link2, Plus, TimerOff, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  backupApi,
  uploadLinksApi,
  uploadedFilesApi,
  type UploadedFileResponse,
  type UploadLinkResponse,
  type UploadLinksQueryParams,
} from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { canManage, canWrite } from '@/lib/auth/roles';
import { formatBytes, formatDateTime, localInputToUtcIso, truncate } from '@/lib/format';
import { BackupDialog } from '@/components/backup/backup-dialog';
import { CopyIconButton } from '@/components/ui/copy-button';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { errorMessage, useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/page-header';
import { Split } from '@/components/split/split';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { FilterBar, buildFilterParams, type FilterField, type FilterValues } from '@/components/filter-bar/filter-bar';
import { SortControl, type SortState } from '@/components/filter-bar/sort-control';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Select } from '@/components/ui/inputs';
import { useClientsQuery } from '@/features/clients/hooks';

const SORT_OPTIONS = [
  { value: 'created_time', label: 'created_time' },
  { value: 'expires_time', label: 'expires_time' },
  { value: 'status', label: 'status' },
  { value: 'client_id', label: 'client_id' },
  { value: 'created_by', label: 'created_by' },
];

const UPLOAD_LINK_STATUS_OPTIONS = [
  { value: 'active', label: 'active' },
  { value: 'expired', label: 'expired' },
  { value: 'used', label: 'used' },
];

const FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'client_id', label: 'Client ID' },
  { kind: 'select', name: 'status', label: 'Status', options: UPLOAD_LINK_STATUS_OPTIONS },
  {
    kind: 'dateRange',
    label: 'Created',
    after: 'created_time_after',
    before: 'created_time_before',
  },
  {
    kind: 'dateRange',
    label: 'Expires',
    after: 'expires_time_after',
    before: 'expires_time_before',
  },
];

const ADVANCED_FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'link_id', label: 'Link ID (exact)' },
  { kind: 'text', name: 'created_by', label: 'Created by' },
  { kind: 'boolean', name: 'has_expiry', label: 'Has expiry' },
];

const ALL_FIELDS = [...FILTER_FIELDS, ...ADVANCED_FILTER_FIELDS];

export function UploadsPage() {
  const { role } = useAuth();
  const writable = canWrite(role);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>({ sortBy: 'created_time', sortDir: 'desc' });
  const [filters, setFilters] = useState<FilterValues>({});
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteFileTarget, setDeleteFileTarget] = useState<UploadedFileResponse | null>(null);
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<UploadLinkResponse | null>(null);
  const [showBackup, setShowBackup] = useState(false);
  const isSuperadmin = canManage(role);

  const backupMutation = useMutation({
    mutationFn: (params: { password: string }) => backupApi.uploadedFiles(params.password),
    onSuccess: () => {
      toast.success('Uploaded files backup downloaded.');
      setShowBackup(false);
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not get the backup.')),
  });

  const queryParams = useMemo<UploadLinksQueryParams>(
    () => ({
      page,
      pageSize,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
      ...(buildFilterParams(ALL_FIELDS, filters) as Partial<UploadLinksQueryParams>),
    }),
    [page, pageSize, sort, filters],
  );

  const query = useLiveQuery({
    queryKey: ['upload-links', queryParams],
    queryFn: () => uploadLinksApi.query(queryParams),
  });
  const links = query.data?.items ?? [];
  const selectedLink = links.find((link) => link.link_id === selectedLinkId) ?? null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['upload-links'] });
    void queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const expireMutation = useMutation({
    mutationFn: uploadLinksApi.expire,
    onSuccess: () => {
      toast.success('Upload link expired.');
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not expire the link.')),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: uploadLinksApi.remove,
    onSuccess: () => {
      toast.success('Upload link deleted.');
      setSelectedLinkId(null);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not delete the link.')),
  });

  const deleteFileMutation = useMutation({
    mutationFn: uploadedFilesApi.remove,
    onSuccess: () => {
      toast.success('Uploaded file deleted.');
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not delete the file.')),
  });

  const columns = useMemo<Column<UploadLinkResponse>[]>(
    () => [
      {
        key: 'link_id',
        header: 'Link ID',
        render: (row) => <span className="font-mono text-xs text-neon-300">{truncate(row.link_id, 18)}</span>,
      },
      {
        key: 'client_id',
        header: 'Client',
        render: (row) => <span className="font-mono text-xs">{row.client_id ?? '—'}</span>,
      },
      { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
      { key: 'created_by', header: 'Created by', render: (row) => <span className="text-xs">{row.created_by ?? '—'}</span> },
      {
        key: 'created_time',
        header: 'Created',
        render: (row) => <span className="whitespace-nowrap text-xs text-fog-dim">{formatDateTime(row.created_time)}</span>,
      },
      {
        key: 'expires_time',
        header: 'Expires',
        render: (row) => <span className="whitespace-nowrap text-xs text-fog-dim">{formatDateTime(row.expires_time)}</span>,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Uploads"
        subtitle="Single-use upload links — files clients send back appear under each link."
        onReload={() => void query.refetch()}
        reloading={query.isFetching}
      >
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
        {writable ? (
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            Create upload link
          </Button>
        ) : null}
      </PageHeader>

      <Split storageKey="uploads" defaultRight={420}>
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
            <DataTable<UploadLinkResponse>
              columns={columns}
              rows={links}
              rowKey={(row) => row.link_id ?? ''}
              loading={query.isLoading}
              page={page}
              pageSize={pageSize}
              totalCount={query.data?.totalCount ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPage(1);
                setPageSize(size);
              }}
              onRowClick={(row) => setSelectedLinkId(row.link_id ?? null)}
              isSelected={(row) => row.link_id === selectedLinkId}
              emptyMessage={
                query.isError
                  ? query.error instanceof Error
                    ? query.error.message
                    : 'Failed to load upload links.'
                  : 'No upload links yet.'
              }
              actions={(row) => (
                <>
                  {row.upload_url ? (
                    <CopyIconButton text={row.upload_url} title="Copy upload URL" />
                  ) : null}
                  {writable ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      title="Delete upload link"
                      className="hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setDeleteLinkTarget(row)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  ) : null}
                </>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <section className="panel p-4">
            <h2 className="mb-3 text-sm font-semibold text-fog">Upload link</h2>
            {selectedLink ? (
              <div className="space-y-3 text-xs">
                <dl className="space-y-1.5 rounded-lg border border-ink-600 bg-ink-850/70 p-3">
                  <InfoRow label="Link ID" value={<span className="font-mono">{selectedLink.link_id}</span>} />
                  <InfoRow label="Status" value={<StatusBadge value={selectedLink.status} />} />
                  <InfoRow label="Client" value={selectedLink.client_id ?? '—'} mono />
                  <InfoRow label="Created by" value={selectedLink.created_by ?? '—'} />
                  <InfoRow label="Created" value={formatDateTime(selectedLink.created_time)} />
                  <InfoRow label="Expires" value={formatDateTime(selectedLink.expires_time)} />
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">
                      Upload URL
                    </dt>
                    <dd className="mt-1 flex items-center gap-1.5">
                      <code className="min-w-0 flex-1 break-all rounded bg-ink-900 px-2 py-1 font-mono text-[10px] text-neon-300">
                        {selectedLink.upload_url ?? '—'}
                      </code>
                      {selectedLink.upload_url ? (
                        <button
                          title="Copy URL"
                          className="rounded-md border border-ink-500 p-1.5 text-fog-dim transition hover:border-neon-500/50 hover:text-neon-300"
                          onClick={() => void navigator.clipboard?.writeText(selectedLink.upload_url ?? '')}
                        >
                          <Copy size={12} />
                        </button>
                      ) : null}
                    </dd>
                  </div>
                </dl>
                <p className="text-[11px] text-fog-faint">
                  Upload links are single-use — there is no usage-count field.
                </p>
                {writable ? (
                  <div className="flex justify-end">
                    <Button
                      variant="danger"
                      size="sm"
                      loading={expireMutation.isPending}
                      disabled={!selectedLink.link_id}
                      onClick={() => {
                        if (selectedLink.link_id) expireMutation.mutate(selectedLink.link_id);
                      }}
                    >
                      <TimerOff size={14} />
                      Expire link
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-fog-faint">
                Select a link to see its details and uploaded files.
              </p>
            )}
          </section>

          {selectedLink?.link_id ? (
            <UploadedFilesPanel
              linkId={selectedLink.link_id}
              writable={writable}
              onDeleteFile={setDeleteFileTarget}
            />
          ) : null}
        </div>
      </Split>

      {showCreate ? (
        <CreateUploadLinkModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            invalidate();
          }}
        />
      ) : null}

      <BackupDialog
        open={showBackup}
        title="Backup uploaded files"
        description="Downloads a file with the uploaded files from the server. Only superadmins can get backups."
        downloading={backupMutation.isPending}
        onClose={() => setShowBackup(false)}
        onDownload={(params) => backupMutation.mutate(params)}
      />

      <ConfirmDialog
        open={deleteFileTarget !== null}
        title="Delete uploaded file"
        body={
          <>
            Delete <span className="font-mono text-fog">{deleteFileTarget?.file_name}</span>? This
            removes the stored file permanently.
          </>
        }
        loading={deleteFileMutation.isPending}
        onCancel={() => setDeleteFileTarget(null)}
        onConfirm={() => {
          if (!deleteFileTarget?.file_id) return;
          deleteFileMutation.mutate(deleteFileTarget.file_id, {
            onSuccess: () => setDeleteFileTarget(null),
          });
        }}
      />

      <ConfirmDialog
        open={deleteLinkTarget !== null}
        title="Delete upload link"
        body={
          <>
            Delete link <span className="font-mono text-fog">{deleteLinkTarget?.link_id}</span>? The
            client will no longer be able to upload through it. Files already uploaded remain
            available under the link's history.
          </>
        }
        loading={deleteLinkMutation.isPending}
        onCancel={() => setDeleteLinkTarget(null)}
        onConfirm={() => {
          const linkId = deleteLinkTarget?.link_id;
          setDeleteLinkTarget(null);
          if (linkId) deleteLinkMutation.mutate(linkId);
        }}
      />
    </>
  );
}

/* ----------------------- files uploaded through a link ----------------------- */

function UploadedFilesPanel({
  linkId,
  writable,
  onDeleteFile,
}: {
  linkId: string;
  writable: boolean;
  onDeleteFile: (file: UploadedFileResponse) => void;
}) {
  const toast = useToast();
  const [page, setPage] = useState(1);

  const query = useLiveQuery({
    queryKey: ['uploaded-files', { upload_link_id: linkId, page }],
    queryFn: () =>
      uploadedFilesApi.query({
        upload_link_id: linkId,
        page,
        pageSize: 10,
        sortBy: 'uploaded_time',
        sortDir: 'desc',
      }),
  });
  const files = query.data?.items ?? [];

  const downloadingId = useState<string | null>(null);

  return (
    <section className="panel p-4">
      <h2 className="mb-3 text-sm font-semibold text-fog">Files uploaded via this link</h2>
      {files.length === 0 ? (
        <p className="py-6 text-center text-xs text-fog-faint">Nothing uploaded through this link yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.file_id}
              className="flex items-center gap-3 rounded-lg border border-ink-600 bg-ink-850/70 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-fog">{file.file_name}</p>
                <p className="mt-0.5 text-[10px] text-fog-faint">
                  {formatBytes(file.size_bytes)} · {file.content_type ?? 'unknown type'} ·{' '}
                  {formatDateTime(file.uploaded_time)}
                </p>
              </div>
              <Button
                variant="secondary"
                size="xs"
                title="Download file"
                onClick={() => {
                  if (!file.file_id) return;
                  downloadingId[1](file.file_id);
                  uploadedFilesApi
                    .download(file.file_id)
                    .catch((error) => toast.error(errorMessage(error, 'Download failed.')))
                    .finally(() => downloadingId[1](null));
                }}
              >
                <Download size={12} />
              </Button>
              {writable ? (
                <Button
                  variant="ghost"
                  size="xs"
                  title="Delete file"
                  className="hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => onDeleteFile(file)}
                >
                  <Trash2 size={12} />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {(query.data?.totalCount ?? 0) > 10 ? (
        <div className="mt-3 flex justify-end gap-2 text-[11px] text-fog-dim">
          <button
            className="rounded border border-ink-500 px-2 py-0.5 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Prev
          </button>
          <button
            className="rounded border border-ink-500 px-2 py-0.5 disabled:opacity-40"
            disabled={page * 10 >= (query.data?.totalCount ?? 0)}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------ create link modal ----------------------------- */

function CreateUploadLinkModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [clientId, setClientId] = useState('');
  const [expiresTime, setExpiresTime] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Registered clients to pick from (first 200, sorted by name).
  const clientsQuery = useClientsQuery({ page: 1, pageSize: 200, sortBy: 'client_name', sortDir: 'asc' });
  const clientOptions = (clientsQuery.data?.items ?? []).map((client) => ({
    value: client.client_id ?? '',
    label: client.client_name
      ? `${client.client_id} — ${client.client_name}`
      : client.client_id ?? '',
  }));

  const mutation = useMutation({
    mutationFn: uploadLinksApi.create,
    onSuccess: onCreated,
    onError: (error) => setLocalError(errorMessage(error, 'Could not create the upload link.')),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    if (!clientId.trim()) {
      setLocalError('Pick the client that is allowed to upload.');
      return;
    }
    mutation.mutate({
      client_id: clientId.trim(),
      expires_time: localInputToUtcIso(expiresTime) ?? null,
    });
  }

  return (
    <Modal open title="Create upload link" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Client" htmlFor="ul-client" hint="Required — the client allowed to upload.">
          <Select
            id="ul-client"
            value={clientId}
            placeholder={clientsQuery.isLoading ? 'Loading clients…' : 'Select a client…'}
            options={clientOptions}
            onChange={(event) => setClientId(event.target.value)}
          />
        </Field>
        <Field label="Expires (optional)" htmlFor="ul-expires">
          <Input
            id="ul-expires"
            type="datetime-local"
            value={expiresTime}
            onChange={(event) => setExpiresTime(event.target.value)}
          />
        </Field>
        {localError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {localError}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={mutation.isPending}>
            <Link2 size={14} />
            Create link
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">
        {label}
      </dt>
      <dd className={`min-w-0 break-all text-right ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
