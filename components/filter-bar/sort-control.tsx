'use client';

/**
 * Sort control bound to each endpoint's real `sortBy` / `sortDir` query
 * parameters — the options list comes from the page configuration.
 */
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { SelectOption } from '@/components/ui/inputs';

export interface SortState {
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export function SortControl({
  value,
  options,
  onChange,
}: {
  value: SortState;
  options: SelectOption[];
  onChange: (sort: SortState) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-faint">
        Sort
      </label>
      <select
        value={value.sortBy}
        onChange={(event) => onChange({ ...value, sortBy: event.target.value })}
        className="h-8 rounded-lg border border-ink-500 bg-ink-900 px-2 text-xs text-fog outline-none focus:border-neon-500/60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        onClick={() =>
          onChange({ ...value, sortDir: value.sortDir === 'asc' ? 'desc' : 'asc' })
        }
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-500 bg-ink-900 text-fog-dim transition hover:border-neon-500/50 hover:text-neon-300"
        title={value.sortDir === 'asc' ? 'Ascending — click to flip' : 'Descending — click to flip'}
        aria-label="Toggle sort direction"
      >
        {value.sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      </button>
    </div>
  );
}
