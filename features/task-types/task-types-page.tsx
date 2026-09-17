'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, Save, Tags, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  taskTypesApi,
  type TaskTypeResponse,
  type TaskTypesQueryParams,
} from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { canManage } from '@/lib/auth/roles';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { errorMessage, useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { FilterBar, buildFilterParams, type FilterField, type FilterValues } from '@/components/filter-bar/filter-bar';
import { SearchBox } from '@/components/filter-bar/search-box';
import { SortControl, type SortState } from '@/components/filter-bar/sort-control';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Textarea } from '@/components/ui/inputs';
import { truncate } from '@/lib/format';

const SORT_OPTIONS = [
  { value: 'task_type_id', label: 'task_type_id' },
  { value: 'task_type_name', label: 'task_type_name' },
];

const FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'task_type_name_contains', label: 'Name contains' },
  { kind: 'text', name: 'description_contains', label: 'Description contains' },
  { kind: 'boolean', name: 'has_description', label: 'Has description' },
];

const ADVANCED_FILTER_FIELDS: FilterField[] = [
  { kind: 'text', name: 'task_type_id', label: 'Task type ID (exact)' },
  { kind: 'text', name: 'task_type_name', label: 'Name (exact)' },
];

const ALL_FIELDS = [...FILTER_FIELDS, ...ADVANCED_FILTER_FIELDS];

export function TaskTypesPage() {
  const { role } = useAuth();
  const manage = canManage(role);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>({ sortBy: 'task_type_id', sortDir: 'asc' });
  const [filters, setFilters] = useState<FilterValues>({});
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskTypeResponse | null>(null);

  const queryParams = useMemo<TaskTypesQueryParams>(
    () => ({
      page,
      pageSize,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
      ...(buildFilterParams(ALL_FIELDS, filters) as Partial<TaskTypesQueryParams>),
    }),
    [page, pageSize, sort, filters],
  );

  const query = useLiveQuery({
    queryKey: ['task-types', search ? { q: search, ...queryParams } : queryParams],
    queryFn: () =>
      search
        ? taskTypesApi.search({ ...queryParams, q: search })
        : taskTypesApi.query(queryParams),
    paused: formDirty,
  });
  const taskTypes = query.data?.items ?? [];
  const selected = taskTypes.find((type) => type.task_type_id === selectedId) ?? null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['task-types'] });
  };

  const deleteMutation = useMutation({
    mutationFn: taskTypesApi.remove,
    onSuccess: () => {
      toast.success('Task type deleted.');
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not delete the task type.')),
  });

  const columns = useMemo<Column<TaskTypeResponse>[]>(
    () => [
      {
        key: 'task_type_name',
        header: 'Name',
        render: (row) => <span className="font-medium text-fog">{row.task_type_name ?? '—'}</span>,
      },
      {
        key: 'task_type_id',
        header: 'ID',
        className: 'w-20 text-right',
        render: (row) => <span className="font-mono text-xs text-neon-300">{row.task_type_id}</span>,
      },
      {
        key: 'description',
        header: 'Description',
        render: (row) => (
          <span className="text-xs text-fog-dim">{truncate(row.description, 96) || '—'}</span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Task Types"
        subtitle="Kinds of tasks that can be assigned to clients."
        onReload={() => void query.refetch()}
        reloading={query.isFetching}
      >
        <SearchBox
          value={search}
          placeholder="Search task types… (Enter)"
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
            Create task type
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
            <DataTable<TaskTypeResponse>
              columns={columns}
              rows={taskTypes}
              rowKey={(row) => String(row.task_type_id)}
              loading={query.isLoading}
              page={page}
              pageSize={pageSize}
              totalCount={query.data?.totalCount ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPage(1);
                setPageSize(size);
              }}
              onRowClick={(row) => setSelectedId(row.task_type_id ?? null)}
              isSelected={(row) => (row.task_type_id ?? null) === selectedId}
              emptyMessage={
                query.isError
                  ? query.error instanceof Error
                    ? query.error.message
                    : 'Failed to load task types.'
                  : 'No task types yet.'
              }
              actions={
                manage
                  ? (row) => (
                      <Button
                        variant="ghost"
                        size="xs"
                        title="Delete task type"
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
            <h2 className="text-sm font-semibold text-fog">Edit task type</h2>
          </div>
          {!manage ? (
            <p className="py-8 text-center text-xs text-fog-faint">
              Super admin only — your role cannot edit task types.
            </p>
          ) : selected ? (
            <EditTaskTypeForm
              key={selected.task_type_id}
              taskType={selected}
              onDirtyChange={setFormDirty}
            />
          ) : (
            <p className="py-8 text-center text-xs text-fog-faint">
              Select a task type on the left to edit it.
            </p>
          )}
        </section>
      </div>

      {showCreate ? (
        <CreateTaskTypeModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            invalidate();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete task type"
        body={
          <>
            Delete task type{' '}
            <span className="font-mono text-fog">
              {deleteTarget?.task_type_id} — {deleteTarget?.task_type_name}
            </span>
            ? If tasks still reference it, the API will refuse with a 409 conflict.
          </>
        }
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.task_type_id === undefined || deleteTarget === null) return;
          deleteMutation.mutate(deleteTarget.task_type_id, {
            onSuccess: () => {
              if (selectedId === deleteTarget.task_type_id) setSelectedId(null);
              setDeleteTarget(null);
            },
          });
        }}
      />
    </>
  );
}

function EditTaskTypeForm({
  taskType,
  onDirtyChange,
}: {
  taskType: TaskTypeResponse;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(taskType.task_type_name ?? '');
  const [description, setDescription] = useState(taskType.description ?? '');

  const dirty =
    name !== (taskType.task_type_name ?? '') ||
    description !== (taskType.description ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      taskType.task_type_id === undefined
        ? Promise.reject(new Error('Task type id missing.'))
        : taskTypesApi.patch(taskType.task_type_id, {
            task_type_name: name,
            description,
          }),
    onSuccess: () => {
      toast.success('Task type updated.');
      void queryClient.invalidateQueries({ queryKey: ['task-types'] });
      onDirtyChange(false);
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not update the task type.')),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <Field label="Task type ID">
        <Input value={String(taskType.task_type_id)} readOnly className="font-mono opacity-70" />
      </Field>
      <Field label="Name" htmlFor="tt-name">
        <Input id="tt-name" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Description" htmlFor="tt-desc">
        <Textarea
          id="tt-desc"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={!dirty} loading={mutation.isPending}>
          <Save size={14} />
          Save changes
        </Button>
      </div>
    </form>
  );
}

function CreateTaskTypeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [taskTypeId, setTaskTypeId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: taskTypesApi.create,
    onSuccess: onCreated,
    onError: (error) => setLocalError(errorMessage(error, 'Could not create the task type.')),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    const parsedId = Number(taskTypeId);
    if (!taskTypeId || Number.isNaN(parsedId) || !Number.isInteger(parsedId)) {
      setLocalError('Task type ID must be an integer. It cannot be changed later.');
      return;
    }
    if (!name.trim()) {
      setLocalError('Name is required.');
      return;
    }
    mutation.mutate({
      task_type_id: parsedId,
      task_type_name: name.trim(),
      description: description || undefined,
    });
  }

  return (
    <Modal open title="Create task type" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Task type ID"
          htmlFor="ctt-id"
          hint="Numeric and immutable — pick it carefully."
        >
          <Input
            id="ctt-id"
            type="number"
            value={taskTypeId}
            autoFocus
            onChange={(event) => setTaskTypeId(event.target.value)}
          />
        </Field>
        <Field label="Name" htmlFor="ctt-name">
          <Input id="ctt-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Description" htmlFor="ctt-desc">
          <Textarea
            id="ctt-desc"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
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
            <Tags size={14} />
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
