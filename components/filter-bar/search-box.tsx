'use client';

/**
 * Search box for the `GET /resource/search?q=` endpoints. Submitting with an
 * empty query clears the search and returns to the regular query endpoint.
 */
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export function SearchBox({
  value,
  placeholder = 'Search…',
  onSearch,
}: {
  value: string;
  placeholder?: string;
  onSearch: (query: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <form
      className="relative w-full max-w-xs"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft.trim());
      }}
    >
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog-faint"
      />
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        className="input-base h-9 pl-8 pr-8 text-xs"
        aria-label="Search"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            onSearch('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-fog-faint transition hover:text-fog"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      ) : null}
    </form>
  );
}
