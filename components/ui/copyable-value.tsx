'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Click-to-copy value for table rows (task ids, client ids…). Clicking
 * copies the raw value to the clipboard and flashes a check mark.
 * Stops propagation so the row stays unselected when copied.
 */
export function CopyableValue({
  value,
  className = '',
  title,
}: {
  value: string;
  className?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      title={title ?? 'Click to copy'}
      className={`inline-flex max-w-full cursor-pointer items-center gap-1 rounded px-0.5 text-left transition hover:text-neon-300 ${
        copied ? 'text-neon-300' : ''
      } ${className}`}
      onClick={(event) => {
        event.stopPropagation();
        void navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
    >
      <span className="truncate">{value}</span>
      {copied ? <Check size={11} className="shrink-0" /> : null}
    </button>
  );
}
