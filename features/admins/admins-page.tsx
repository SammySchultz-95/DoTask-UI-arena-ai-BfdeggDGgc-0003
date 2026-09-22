'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminsApi,
  type AdminResponse,
  type AdminsQueryParams,
  type PatchAdminRequest,
} from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { canManage, isReadonly, ROLE_LABELS, ROLE_OPTIONS } from '@/lib/auth/roles';
import type { AdminRole } from '@/lib/auth/storage';
import { formatDateTime } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { errorMessage, useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { FilterBar, buildFilterParams, type FilterField, type FilterValues } from '@/components/filter-bar/filter-bar';
import { SearchBox } from '@/components/filter-bar/search-box';
import { SortControl, type SortState } from '@/components/filter-bar/sort-control';
import { NeutralBadge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { Checkbox, Field, Input, PasswordInput, Select } from '@/components/ui/inputs';

const SORT_OPTIONS = [
  { value: 'creation_time', label: 'creation_time' },
  { value: 'username', label: 'username' },
  { value: 'role', label: 'role' },
  { value: 'is_active', label: 'is_active' },
];

const FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'username_contains', label: 'Username contains' },
  {
    kind: 'select',
    name: 'role',
    label: 'Role',
    options: ROLE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
  },
  { kind: 'boolean', name: 'is_active', label: 'Active' },
  { kind: 'boolean', name: 'must_change_password', label: 'Must change password' },
];

const ADVANCED_FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'username', label: 'Username (exact)' },
  {
    kind: 'text',
    name: 'has_ip',
    label: 'Has IP',
    placeholder: 'e.g. 192.168.1.5 or 10.0.0.0/24',
  },
  {
    kind: 'dateRange',
    label: 'Created',
    after: 'creation_time_after',
    before: 'creation_time_before',
  },
];

const ALL_FIELDS = [...FILTER_FIELDS, ...ADVANCED_FILTER_FIELDS];

export function AdminsPage() {
  const { role: myRole, username: myUsername } = useAuth();
  const manage = canManage(myRole);
  const readonlySelf = isReadonly(myRole);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>({ sortBy: 'creation_time', sortDir: 'desc' });
  const [filters, setFilters] = useState<FilterValues>({});
  const [search, setSearch] = useState('');
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminResponse | null>(null);

  const queryParams = useMemo<AdminsQueryParams>(
    () => ({
      page,
      pageSize,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
      ...(buildFilterParams(ALL_FIELDS, filters) as Partial<AdminsQueryParams>),
    }),
    [page, pageSize, sort, filters],
  );

  const query = useLiveQuery({
    queryKey: ['admins', search ? { q: search, ...queryParams } : queryParams],
    queryFn: () =>
      search
        ? adminsApi.search({ ...queryParams, q: search })
        : adminsApi.query(queryParams),
    paused: formDirty,
  });
  const admins = query.data?.items ?? [];
  const selected = admins.find((admin) => admin.username === selectedUsername) ?? null;

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admins'] });

  const deleteMutation = useMutation({
    mutationFn: adminsApi.remove,
    onSuccess: () => {
      toast.success('Admin deleted.');
      invalidate();
    },
    // 400 own account / 409 last active superadmin — surfaced as-is.
    onError: (error) => toast.error(errorMessage(error, 'Could not delete the admin.')),
  });

  const columns = useMemo<Column<AdminResponse>[]>(
    () => [
      {
        key: 'username',
        header: 'Username',
        render: (row) => (
          <span className="flex items-center gap-2 font-medium text-fog">
            {row.username ?? '—'}
            {row.username === myUsername ? <NeutralBadge>you</NeutralBadge> : null}
          </span>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (row) => (
          <span className="text-xs text-neon-300">
            {row.role ? (ROLE_LABELS[row.role as AdminRole] ?? row.role) : '—'}
          </span>
        ),
      },
      {
        key: 'is_active',
        header: 'Active',
        render: (row) => <StatusBadge value={row.is_active ? 'active' : 'disabled'} />,
      },
      {
        key: 'must_change_password',
        header: 'Password',
        render: (row) =>
          row.must_change_password ? <NeutralBadge>must change</NeutralBadge> : <span className="text-xs text-fog-faint">ok</span>,
      },
      {
        key: 'creation_time',
        header: 'Created',
        render: (row) => <span className="whitespace-nowrap text-xs text-fog-dim">{formatDateTime(row.creation_time)}</span>,
      },
    ],
    [myUsername],
  );

  // Read-only admins cannot see any other admins — not even other read-only
  // admins. The API enforces this too; we gate the whole page as well.
  if (readonlySelf) {
    return (
      <>
        <PageHeader title="Admins" subtitle="Panel accounts and their roles." />
        <div className="panel">
          <div className="py-16 text-center">
            <p className="text-sm text-fog-dim">You don't have access to view admins.</p>
            <p className="mt-1 text-xs text-fog-faint">
              Read-only accounts cannot see other admin accounts.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Normal admins can view (API-scoped) admins but not change them.
  const canEdit = manage;

  return (
    <>
      <PageHeader
        title="Admins"
        subtitle="Panel accounts and their roles."
        onReload={() => void query.refetch()}
        reloading={query.isFetching}
      >
        <SearchBox
          value={search}
          placeholder="Search admins… (Enter)"
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
        {manage ? (
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            Create admin
          </Button>
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
            <DataTable<AdminResponse>
              columns={columns}
              rows={admins}
              rowKey={(row) => row.username ?? ''}
              loading={query.isLoading}
              page={page}
              pageSize={pageSize}
              totalCount={query.data?.totalCount ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPage(1);
                setPageSize(size);
              }}
              onRowClick={(row) => setSelectedUsername(row.username ?? null)}
              isSelected={(row) => row.username === selectedUsername}
              emptyMessage={
                query.isError
                  ? query.error instanceof Error
                    ? query.error.message
                    : 'Failed to load admins.'
                  : 'No admins found.'
              }
              actions={
                manage
                  ? (row) =>
                      row.username === myUsername ? null : (
                        <Button
                          variant="ghost"
                          size="xs"
                          title="Delete admin"
                          className="hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      )
                  : undefined
              }
            />
          </div>
        </div>

        <section className="panel h-fit p-4">
          <div className="mb-3 flex items-center gap-2">
            <Pencil size={15} className="text-neon-400" />
            <h2 className="text-sm font-semibold text-fog">
              {canEdit ? 'Edit admin' : 'Admin details'}
            </h2>
          </div>
          {selected ? (
            selected.username === myUsername ? (
              <p className="py-8 text-center text-xs leading-relaxed text-fog-faint">
                This is your own account — the API refuses edits to it (400). Use the Profile
                menu in the sidebar footer to change your password.
              </p>
            ) : (
              <EditAdminForm
                key={selected.username}
                admin={selected}
                readonly={!canEdit}
                onDirtyChange={setFormDirty}
                onSaved={invalidate}
              />
            )
          ) : (
            <p className="py-8 text-center text-xs text-fog-faint">
              {canEdit
                ? 'Select an admin to edit role, activation or password.'
                : 'Select an admin to view their details.'}
            </p>
          )}
        </section>
      </div>

      {showCreate ? (
        <CreateAdminModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            invalidate();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete admin"
        body={
          <>
            Delete admin <span className="font-mono text-fog">{deleteTarget?.username}</span>? The
            API refuses deleting your own account and the last active superadmin.
          </>
        }
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget?.username) return;
          deleteMutation.mutate(deleteTarget.username, {
            onSuccess: () => {
              if (selectedUsername === deleteTarget.username) setSelectedUsername(null);
              setDeleteTarget(null);
            },
          });
        }}
      />
    </>
  );
}

function EditAdminForm({
  admin,
  readonly = false,
  onDirtyChange,
  onSaved,
}: {
  admin: AdminResponse;
  /** View-only mode for normal admins — details visible, no modifications. */
  readonly?: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [role, setRole] = useState(admin.role ?? 'normaladmin');
  const [isActive, setIsActive] = useState(Boolean(admin.is_active));
  const [password, setPassword] = useState('');

  const dirty = role !== admin.role || isActive !== admin.is_active || password !== '';

  const mutation = useMutation({
    mutationFn: () => {
      const body: PatchAdminRequest = {
        role,
        is_active: isActive,
      };
      if (password) body.password = password;
      return adminsApi.patch(admin.username ?? '', body);
    },
    onSuccess: () => {
      toast.success('Admin updated.');
      setPassword('');
      onDirtyChange(false);
      onSaved();
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not update the admin.')),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <Field label="Username">
        <Input value={admin.username ?? ''} readOnly className="font-mono opacity-70" />
      </Field>
      <Field label="Role" htmlFor="ea-role">
        <Select
          id="ea-role"
          value={role}
          disabled={readonly}
          options={ROLE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          onChange={(event) => setRole(event.target.value)}
        />
      </Field>
      <Checkbox label="Active" checked={isActive} disabled={readonly} onChange={setIsActive} />
      {!readonly ? (
        <Field label="Reset password" htmlFor="ea-password" hint="Leave empty to keep the current password.">
          <PasswordInput
            id="ea-password"
            value={password}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
      ) : null}
      {readonly ? (
        <p className="text-xs text-fog-faint">
          You can view admin details, but only superadmins can modify them.
        </p>
      ) : (
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="sm" disabled={!dirty} loading={mutation.isPending}>
            <Save size={14} />
            Save changes
          </Button>
        </div>
      )}
    </form>
  );
}

function CreateAdminModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('normaladmin');
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: adminsApi.create,
    onSuccess: onCreated,
    onError: (error) => setLocalError(errorMessage(error, 'Could not create the admin.')),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    if (!username.trim() || !password) {
      setLocalError('Username and password are required.');
      return;
    }
    mutation.mutate({ username: username.trim(), password, role });
  }

  return (
    <Modal open title="Create admin" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Username" htmlFor="ca-username">
          <Input
            id="ca-username"
            value={username}
            autoFocus
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="ca-password">
          <PasswordInput
            id="ca-password"
            value={password}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field label="Role" htmlFor="ca-role">
          <Select
            id="ca-role"
            value={role}
            options={ROLE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(event) => setRole(event.target.value as AdminRole)}
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
            Create admin
          </Button>
        </div>
      </form>
    </Modal>
  );
}
