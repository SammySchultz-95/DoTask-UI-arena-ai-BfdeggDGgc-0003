'use client';

/**
 * Declarative filter bar. Fields map 1:1 onto each endpoint's documented
 * query parameters — no generic "any field" builder.
 *
 * Range-style parameters (numeric exact/min/max and date after/before) are
 * grouped into a single control instead of one raw input each; low-value
 * ranges live behind the "Advanced filters" disclosure.
 */
import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { Input, Select, type SelectOption } from '@/components/ui/inputs';

export type FilterField =
  | { kind: 'text'; name: string; label: string; placeholder?: string }
  | { kind: 'select'; name: string; label: string; options: SelectOption[] }
  | { kind: 'boolean'; name: string; label: string }
  | {
      kind: 'numberRange';
      label: string;
      exact?: string;
      min: string;
      max: string;
    }
  | { kind: 'dateRange'; label: string; after: string; before: string };

export type FilterValues = Record<string, string>;

const BOOL_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

function fieldNames(field: FilterField): string[] {
  switch (field.kind) {
    case 'numberRange':
      return [field.exact, field.min, field.max].filter(Boolean) as string[];
    case 'dateRange':
      return [field.after, field.before];
    default:
      return [field.name];
  }
}

export function isFilterActive(values: FilterValues, fields: FilterField[]): boolean {
  return fields.some((field) => fieldNames(field).some((name) => values[name]));
}

/**
 * Convert raw filter state into API query params. datetime-local values are
 * converted to ISO-8601 UTC strings; empty values are dropped.
 */
export function buildFilterParams(
  fields: FilterField[],
  values: FilterValues,
): Record<string, string> {
  const dateNames = new Set(
    fields.flatMap((field) =>
      field.kind === 'dateRange' ? [field.after, field.before] : [],
    ),
  );
  const params: Record<string, string> = {};
  for (const field of fields) {
    for (const name of fieldNames(field)) {
      const raw = values[name];
      if (!raw) continue;
      if (dateNames.has(name)) {
        const date = new Date(raw);
        if (!Number.isNaN(date.getTime())) params[name] = date.toISOString();
      } else {
        params[name] = raw;
      }
    }
  }
  return params;
}

export function FilterBar({
  fields,
  advanced = [],
  values,
  onChange,
  onClear,
}: {
  fields: FilterField[];
  advanced?: FilterField[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onClear: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const active =
    isFilterActive(values, fields) || isFilterActive(values, advanced);

  const setValue = (name: string, value: string) =>
    onChange({ ...values, [name]: value });

  const renderField = (field: FilterField) => {
    switch (field.kind) {
      case 'text':
        return (
          <div key={field.label} className="min-w-[150px] flex-1">
            <label className="label-base">{field.label}</label>
            <Input
              value={values[field.name] ?? ''}
              placeholder={field.placeholder ?? 'Any'}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          </div>
        );
      case 'select':
        return (
          <div key={field.label} className="min-w-[140px] flex-1">
            <label className="label-base">{field.label}</label>
            <Select
              value={values[field.name] ?? ''}
              placeholder="Any"
              options={field.options}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          </div>
        );
      case 'boolean':
        return (
          <div key={field.label} className="min-w-[110px]">
            <label className="label-base">{field.label}</label>
            <Select
              value={values[field.name] ?? ''}
              placeholder="Any"
              options={BOOL_OPTIONS}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          </div>
        );
      case 'numberRange':
        return (
          <div key={field.label} className="min-w-[220px]">
            <label className="label-base">{field.label}</label>
            <div className="flex items-center gap-1.5">
              {field.exact ? (
                <Input
                  type="number"
                  value={values[field.exact] ?? ''}
                  placeholder="Exact"
                  onChange={(event) => setValue(field.exact!, event.target.value)}
                />
              ) : null}
              <Input
                type="number"
                value={values[field.min] ?? ''}
                placeholder="Min"
                onChange={(event) => setValue(field.min, event.target.value)}
              />
              <span className="text-xs text-fog-faint">–</span>
              <Input
                type="number"
                value={values[field.max] ?? ''}
                placeholder="Max"
                onChange={(event) => setValue(field.max, event.target.value)}
              />
            </div>
          </div>
        );
      case 'dateRange':
        return (
          <div key={field.label} className="min-w-[300px]">
            <label className="label-base">{field.label}</label>
            <div className="flex items-center gap-1.5">
              <Input
                type="datetime-local"
                value={values[field.after] ?? ''}
                onChange={(event) => setValue(field.after, event.target.value)}
                aria-label={`${field.label} from`}
              />
              <span className="text-xs text-fog-faint">→</span>
              <Input
                type="datetime-local"
                value={values[field.before] ?? ''}
                onChange={(event) => setValue(field.before, event.target.value)}
                aria-label={`${field.label} to`}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {fields.map(renderField)}
        <div className="ml-auto flex items-center gap-2 pb-0.5">
          {advanced.length > 0 ? (
            <button
              onClick={() => setShowAdvanced((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition ${
                showAdvanced || isFilterActive(values, advanced)
                  ? 'border-neon-500/50 text-neon-300'
                  : 'border-ink-400 text-fog-dim hover:text-fog'
              }`}
            >
              <SlidersHorizontal size={13} />
              Advanced
              <ChevronDown
                size={13}
                className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>
          ) : null}
          {active ? (
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-400 px-2.5 py-2 text-xs text-fog-dim transition hover:border-red-500/40 hover:text-red-300"
            >
              <X size={13} />
              Clear
            </button>
          ) : null}
        </div>
      </div>
      {showAdvanced && advanced.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-600 bg-ink-850/60 p-3">
          {advanced.map(renderField)}
        </div>
      ) : null}
    </div>
  );
}
