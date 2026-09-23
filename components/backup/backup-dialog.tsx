'use client';

/**
 * Superadmin backup dialog.
 *
 * Renders the documented filter fields of the chosen backup endpoint
 * (when any), a backup-password field and a "Get backup" button that
 * downloads the file. Restore operations use `RestoreDialog` semantics via
 * the same building blocks.
 */
import { useState, type FormEvent } from 'react';
import { Download, Lock } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/inputs';
import type { FilterField } from '@/components/filter-bar/filter-bar';
import { buildFilterParams } from '@/components/filter-bar/filter-bar';

const BOOL_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

/** Compact single control for one documented filter field. */
function BackupFilterField({
  field,
  filters,
  onChange,
}: {
  field: FilterField;
  filters: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  switch (field.kind) {
    case 'text':
      return (
        <Field label={field.label} htmlFor={`bk-${field.name}`}>
          <Input
            id={`bk-${field.name}`}
            value={filters[field.name] ?? ''}
            placeholder={field.placeholder}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
        </Field>
      );
    case 'select':
      return (
        <Field label={field.label} htmlFor={`bk-${field.name}`}>
          <Select
            id={`bk-${field.name}`}
            value={filters[field.name] ?? ''}
            options={[{ value: '', label: '— any —' }, ...field.options]}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
        </Field>
      );
    case 'boolean':
      return (
        <Field label={field.label} htmlFor={`bk-${field.name}`}>
          <Select
            id={`bk-${field.name}`}
            value={filters[field.name] ?? ''}
            options={[{ value: '', label: '— any —' }, ...BOOL_OPTIONS]}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
        </Field>
      );
    case 'numberRange':
      return (
        <div className="rounded-lg border border-ink-600 bg-ink-850/50 p-2.5">
          <p className="label-base mb-1.5">{field.label}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="min"
              value={filters[field.min] ?? ''}
              onChange={(event) => onChange(field.min, event.target.value)}
            />
            <Input
              type="number"
              placeholder="max"
              value={filters[field.max] ?? ''}
              onChange={(event) => onChange(field.max, event.target.value)}
            />
          </div>
        </div>
      );
    case 'dateRange':
      return (
        <div className="rounded-lg border border-ink-600 bg-ink-850/50 p-2.5">
          <p className="label-base mb-1.5">{field.label}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="datetime-local"
              value={filters[field.after] ?? ''}
              onChange={(event) => onChange(field.after, event.target.value)}
            />
            <Input
              type="datetime-local"
              value={filters[field.before] ?? ''}
              onChange={(event) => onChange(field.before, event.target.value)}
            />
          </div>
        </div>
      );
  }
}

export function BackupDialog({
  open,
  title,
  description,
  filterFields,
  downloading,
  onClose,
  onDownload,
}: {
  open: boolean;
  title: string;
  description?: string;
  /** Documented filter fields of the backup endpoint — omitted if it has none. */
  filterFields?: FilterField[];
  downloading: boolean;
  onClose: () => void;
  /** Called with the password plus the built filter params (strings only). */
  onDownload: (params: { password: string } & Record<string, string>) => void;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function setFilter(name: string, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function reset() {
    setFilters({});
    setPassword('');
    setError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!password) {
      setError('The backup password is required.');
      return;
    }
    onDownload({
      password,
      ...(filterFields ? buildFilterParams(filterFields, filters) : {}),
    });
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal open={open} title={title} onClose={handleClose} wide={Boolean(filterFields?.length)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {description ? <p className="text-xs leading-relaxed text-fog-dim">{description}</p> : null}

        {filterFields && filterFields.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filterFields.map((field) => (
              <BackupFilterField
                key={
                  field.kind === 'numberRange' || field.kind === 'dateRange'
                    ? field.label
                    : field.name
                }
                field={field}
                filters={filters}
                onChange={setFilter}
              />
            ))}
          </div>
        ) : null}

        <Field label="Backup password" htmlFor="bk-password" hint="Required — the server verifies it before producing the file.">
          <div className="relative">
            <Lock size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fog-faint" />
            <Input
              id="bk-password"
              type="password"
              value={password}
              className="pl-8"
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </Field>

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={downloading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={downloading}>
            <Download size={14} />
            Get backup
          </Button>
        </div>
      </form>
    </Modal>
  );
}
