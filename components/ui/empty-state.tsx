'use client';

import type { LucideIcon } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { Button } from './button';
import { Spinner } from './spinner';

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="rounded-full border border-ink-400 bg-ink-700 p-3 text-fog-faint">
        <Icon size={20} />
      </div>
      <p className="text-sm font-medium text-fog-dim">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-fog-faint">{hint}</p> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-sm text-fog-dim">
      <Spinner className="h-4 w-4" />
      {label}
    </div>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="max-w-md text-sm text-red-300">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw size={14} />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
