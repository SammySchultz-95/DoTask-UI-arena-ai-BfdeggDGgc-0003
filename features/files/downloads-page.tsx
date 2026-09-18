'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Copy, FileUp, Link2, TimerOff, Trash2, Upload } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  downloadLinksApi,
  downloadableFilesApi,
  type DownloadableFileResponse,
  type DownloadableFilesQueryParams,
  type DownloadLinkResponse,
} from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { canWrite } from '@/lib/auth/roles';
import { formatBytes, formatDateTime, localInputToUtcIso, truncate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { errorMessage, useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { FilterBar, buildFilterParams, type FilterField, type FilterValues } from '@/components/filter-bar/filter-bar';
import { SearchBox } from '@/components/filter-bar/search-box';
import { SortControl, type SortState } from '@/components/filter-bar/sort-control';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { Field, Input } from '@/components/ui/inputs';

const SORT_OPTIONS = [
  { value: 'uploaded_time', label: 'uploaded_time' },
  { value: 'file_name', label: 'file_name' },
  { value: 'content_type', label: 'content_type' },
  { value: 'uploaded_by', label: 'uploaded_by' },
  { value: 'size_bytes', label: 'size_bytes' },
];

const FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'file_name_contains', label: 'Name contains' },
  { kind: 'text', name: 'content_type_contains', label: 'Content type contains' },
  { kind: 'text', name: 'uploaded_by_contains', label: 'Uploaded by contains' },
  {
    kind: 'dateRange',
    label: 'Uploaded',
    after: 'uploaded_time_after',
    before: 'uploaded_time_before',
  },
];

const ADVANCED_FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'file_id', label: 'File ID (exact)' },
  { kind: 'text', name: 'file_name', label: 'Name (exact)' },
  { kind: 'text', name: 'content_type', label: 'Content type (exact)' },
  { kind: 'text', name: 'uploaded_by', label: 'Uploaded by (exact)' },
  { kind: 'numberRange', label: 'Size (bytes)', min: 'size_bytes_min', max: 'size_bytes_max' },
];

const ALL_FIELDS = [...FILTER_FIELDS, ...ADVANCED_FILTER_FIELDS];

export function DownloadsPage() {
  const { role } = useAuth();
  const writable = canWrite(role);
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>({ sortBy: 'uploaded_time', sortDir: 'desc' });
  const [filters, setFilters] = useState<FilterValues>({});
  const [search, setSearch] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<DownloadLinkResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DownloadableFileResponse | null>(null);

  const queryParams = useMemo<DownloadableFilesQueryParams>(
    () => ({
      page,
      pageSize,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
      ...(buildFilterParams(ALL_FIELDS, filters) as Partial<DownloadableFilesQueryParams>),
    }),
    [page, pageSize, sort, filters],
  );

  const query = useLiveQuery({
    queryKey: ['downloadable-files', search ? { q: search, ...queryParams } : queryParams],
    queryFn: () =>
      search
        ? downloadableFilesApi.search({ ...queryParams, q: search })
        : downloadableFilesApi.query(queryParams),
  });
  const files = query.data?.items ?? [];
  const selectedFile = files.find((file) => file.file_id === selectedFileId) ?? null;

  const invalidateFiles = () => {
    void queryClient.invalidateQueries({ queryKey: ['downloadable-files'] });
    void queryClient.invalidateQueries({ queryKey: ['download-links'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const uploadMutation = useMutation({
    mutationFn: downloadableFilesApi.upload,
    onSuccess: (file) => {
      toast.success(`Uploaded "${file.file_name}".`);
      invalidateFiles();
    },
    onError: (error) => toast.error(errorMessage(error, 'Upload failed.')),
  });

  const deleteMutation = useMutation({
    mutationFn: downloadableFilesApi.remove,
    onSuccess: () => {
      toast.success('File deleted.');
      invalidateFiles();
    },
    onError: (error) => {
      // 409 = active links still reference the file — surface, don't auto-expire.
      toast.error(errorMessage(error, 'Could not delete the file.'));
    },
  });

  const expireMutation = useMutation({
    mutationFn: downloadLinksApi.expire,
    onSuccess: () => {
      toast.success('Link expired.');
      setSelectedLink(null);
      invalidateFiles();
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not expire the link.')),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: downloadLinksApi.remove,
    onSuccess: () => {
      toast.success('Download link deleted.');
      setSelectedLink(null);
      invalidateFiles();
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not delete the link.')),
  });

  const columns = useMemo<Column<DownloadableFileResponse>[]>(
    () => [
      {
        key: 'file_name',
        header: 'File',
        render: (row) => <span className="font-medium text-fog">{row.file_name ?? '—'}</span>,
      },
      {
        key: 'content_type',
        header: 'Content type',
        render: (row) => <span className="font-mono text-xs text-fog-dim">{row.content_type ?? '—'}</span>,
      },
      {
        key: 'size_bytes',
        header: 'Size',
        className: 'text-right',
        render: (row) => <span className="font-mono text-xs">{formatBytes(row.size_bytes)}</span>,
      },
      { key: 'uploaded_by', header: 'Uploaded by', render: (row) => <span className="text-xs">{row.uploaded_by ?? '—'}</span> },
      {
        key: 'uploaded_time',
        header: 'Uploaded',
        render: (row) => <span className="whitespace-nowrap text-xs text-fog-dim">{formatDateTime(row.uploaded_time)}</span>,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Downloads"
        subtitle="Files served to clients through expiring download links."
        onReload={() => void query.refetch()}
        reloading={query.isFetching}
      >
        <SearchBox
          value={search}
          placeholder="Search files… (Enter)"
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
        {writable ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                event.target.value = '';
              }}
            />
            <Button
              variant="primary"
              size="sm"
              loading={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              Upload new file
            </Button>
          </>
        ) : null}
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
            <DataTable<DownloadableFileResponse>
              columns={columns}
              rows={files}
              rowKey={(row) => row.file_id ?? ''}
              loading={query.isLoading}
              page={page}
              pageSize={pageSize}
              totalCount={query.data?.totalCount ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPage(1);
                setPageSize(size);
              }}
              onRowClick={(row) => {
                setSelectedFileId(row.file_id ?? null);
                setSelectedLink(null);
              }}
              isSelected={(row) => row.file_id === selectedFileId}
              renderExpanded={(row) => (
                <FileLinksSubTable
                  fileId={row.file_id ?? ''}
                  writable={writable}
                  selectedLinkId={selectedLink?.link_id ?? null}
                  onSelectLink={setSelectedLink}
                  onDeleteLink={(linkId) => deleteLinkMutation.mutate(linkId)}
                  deleting={deleteLinkMutation.isPending}
                />
              )}
              emptyMessage={
                query.isError
                  ? query.error instanceof Error
                    ? query.error.message
                    : 'Failed to load files.'
                  : 'No downloadable files yet.'
              }
              actions={
                writable
                  ? (row) => (
                      <Button
                        variant="ghost"
                        size="xs"
                        title="Delete file"
                        className="hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <FileUp size={13} />
                      </Button>
                    )
                  : undefined
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* Selected file info + create link */}
          <section className="panel p-4">
            <h2 className="mb-3 text-sm font-semibold text-fog">File</h2>
            {selectedFile ? (
              <div className="space-y-3 text-xs">
                <dl className="space-y-1.5 rounded-lg border border-ink-600 bg-ink-850/70 p-3">
                  <InfoRow label="Name" value={selectedFile.file_name ?? '—'} />
                  <InfoRow label="ID" value={<span className="font-mono">{selectedFile.file_id}</span>} />
                  <InfoRow label="Content type" value={selectedFile.content_type ?? '—'} mono />
                  <InfoRow label="Size" value={formatBytes(selectedFile.size_bytes)} />
                  <InfoRow label="Uploaded by" value={selectedFile.uploaded_by ?? '—'} />
                  <InfoRow label="Uploaded" value={formatDateTime(selectedFile.uploaded_time)} />
                </dl>
                <p className="text-[11px] leading-relaxed text-fog-faint">
                  File metadata isn't editable, and bytes can only be retrieved through a download
                  link — same as a client.
                </p>
                {writable ? (
                  <CreateDownloadLinkForm
                    fileId={selectedFile.file_id ?? ''}
                    onCreated={invalidateFiles}
                  />
                ) : null}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-fog-faint">
                Select a file to see details and create links.
              </p>
            )}
          </section>

          {/* Selected link info + expire */}
          {selectedLink ? (
            <section className="panel p-4">
              <h2 className="mb-3 text-sm font-semibold text-fog">Download link</h2>
              <dl className="space-y-1.5 rounded-lg border border-ink-600 bg-ink-850/70 p-3 text-xs">
                <InfoRow label="Link ID" value={<span className="font-mono">{selectedLink.link_id}</span>} />
                <InfoRow label="Status" value={<StatusBadge value={selectedLink.status} />} />
                <InfoRow label="Created by" value={selectedLink.created_by ?? '—'} />
                <InfoRow label="Created" value={formatDateTime(selectedLink.created_time)} />
                <InfoRow label="Expires" value={formatDateTime(selectedLink.expires_time)} />
                <InfoRow label="Client" value={selectedLink.client_id ?? 'any'} mono />
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">
                    Download URL
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5">
                    <code className="min-w-0 flex-1 break-all rounded bg-ink-900 px-2 py-1 font-mono text-[10px] text-neon-300">
                      {selectedLink.download_url ?? '—'}
                    </code>
                    {selectedLink.download_url ? (
                      <button
                        title="Copy URL"
                        className="rounded-md border border-ink-500 p-1.5 text-fog-dim transition hover:border-neon-500/50 hover:text-neon-300"
                        onClick={() => void navigator.clipboard?.writeText(selectedLink.download_url ?? '')}
                      >
                        <Copy size={12} />
                      </button>
                    ) : null}
                  </dd>
                </div>
              </dl>
              {writable ? (
                <div className="mt-3 flex justify-end">
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
            </section>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete file"
        body={
          <>
            Delete <span className="font-mono text-fog">{deleteTarget?.file_name}</span>? If active
            links still reference it, the API will refuse with a 409 conflict — check the links
            sub-table first (they are not auto-expired).
          </>
        }
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget?.file_id) return;
          deleteMutation.mutate(deleteTarget.file_id, {
            onSuccess: () => {
              if (selectedFileId === deleteTarget.file_id) {
                setSelectedFileId(null);
                setSelectedLink(null);
              }
              setDeleteTarget(null);
            },
          });
        }}
      />
    </>
  );
}

/* ------------------------- links sub-table (per file) ------------------------ */

function FileLinksSubTable({
  fileId,
  writable,
  selectedLinkId,
  onSelectLink,
  onDeleteLink,
  deleting,
}: {
  fileId: string;
  writable: boolean;
  selectedLinkId: string | null;
  onSelectLink: (link: DownloadLinkResponse) => void;
  onDeleteLink: (linkId: string) => void;
  deleting: boolean;
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ sortBy: 'created_time', sortDir: 'desc' });
  const [deleteTarget, setDeleteTarget] = useState<DownloadLinkResponse | null>(null);

  const query = useLiveQuery({
    queryKey: ['download-links', { file_id: fileId, page, sortBy: sort.sortBy, sortDir: sort.sortDir }],
    queryFn: () =>
      downloadLinksApi.query({
        file_id: fileId,
        page,
        pageSize: 5,
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
      }),
  });
  const links = query.data?.items ?? [];

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Link2 size={13} className="text-neon-400" />
        <span className="text-xs font-semibold text-fog">Links for this file</span>
        <span className="ml-auto flex items-center gap-1.5">
          <SortControl
            value={sort}
            options={[
              { value: 'created_time', label: 'created_time' },
              { value: 'expires_time', label: 'expires_time' },
              { value: 'status', label: 'status' },
              { value: 'created_by', label: 'created_by' },
            ]}
            onChange={(next) => {
              setPage(1);
              setSort(next);
            }}
          />
        </span>
      </div>
      {links.length === 0 ? (
        <p className="py-3 text-center text-[11px] text-fog-faint">No links yet for this file.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-fog-faint">
              <th className="px-2 py-1">Link ID</th>
              <th className="px-2 py-1">Status</th>
              <th className="px-2 py-1">Client</th>
              <th className="px-2 py-1">Created by</th>
              <th className="px-2 py-1">Created</th>
              <th className="px-2 py-1">Expires</th>
              {writable ? <th className="px-2 py-1 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr
                key={link.link_id}
                onClick={() => onSelectLink(link)}
                className={`cursor-pointer border-t border-ink-600/50 transition ${
                  link.link_id === selectedLinkId ? 'bg-neon-500/[0.08]' : 'hover:bg-ink-750'
                }`}
              >
                <td className="px-2 py-1.5 font-mono text-[10px] text-neon-300">
                  {truncate(link.link_id, 13)}
                </td>
                <td className="px-2 py-1.5"><StatusBadge value={link.status} /></td>
                <td className="px-2 py-1.5 font-mono">{link.client_id ?? 'any'}</td>
                <td className="px-2 py-1.5">{link.created_by ?? '—'}</td>
                <td className="px-2 py-1.5 whitespace-nowrap text-fog-dim">{formatDateTime(link.created_time)}</td>
                <td className="px-2 py-1.5 whitespace-nowrap text-fog-dim">{formatDateTime(link.expires_time)}</td>
                {writable ? (
                  <td
                    className="px-2 py-1.5 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="xs"
                      title="Delete link"
                      className="hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setDeleteTarget(link)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {writable ? null : null}
      {(query.data?.totalCount ?? 0) > 5 ? (
        <div className="mt-2 flex justify-end gap-2 text-[11px] text-fog-dim">
          <button
            className="rounded border border-ink-500 px-2 py-0.5 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Prev
          </button>
          <button
            className="rounded border border-ink-500 px-2 py-0.5 disabled:opacity-40"
            disabled={page * 5 >= (query.data?.totalCount ?? 0)}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete download link"
        body={
          <>
            Delete link <span className="font-mono text-fog">{deleteTarget?.link_id}</span>? Clients
            holding this link will no longer be able to download the file through it.
          </>
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const linkId = deleteTarget?.link_id;
          setDeleteTarget(null);
          if (linkId) onDeleteLink(linkId);
        }}
      />
    </div>
  );
}

/* ------------------------------ create link form ------------------------------ */

function CreateDownloadLinkForm({
  fileId,
  onCreated,
}: {
  fileId: string;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [expiresTime, setExpiresTime] = useState('');
  const [clientId, setClientId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      downloadLinksApi.create(fileId, {
        expires_time: localInputToUtcIso(expiresTime) ?? null,
        client_id: clientId.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Download link created.');
      setExpiresTime('');
      setClientId('');
      onCreated();
    },
    onError: (error) => setLocalError(errorMessage(error, 'Could not create the link.')),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-ink-600 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neon-300">
        Create link
      </p>
      <Field label="Expires (optional)" htmlFor="dl-expires">
        <Input
          id="dl-expires"
          type="datetime-local"
          value={expiresTime}
          onChange={(event) => setExpiresTime(event.target.value)}
        />
      </Field>
      <Field label="Restrict to client (optional)" htmlFor="dl-client">
        <Input
          id="dl-client"
          value={clientId}
          placeholder="any client"
          onChange={(event) => setClientId(event.target.value)}
          className="font-mono"
        />
      </Field>
      {localError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {localError}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" variant="outline" size="sm" loading={mutation.isPending}>
          <Link2 size={14} />
          Create link
        </Button>
      </div>
    </form>
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
