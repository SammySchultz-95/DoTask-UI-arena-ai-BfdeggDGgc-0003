'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PageHeader({
  title,
  subtitle,
  onReload,
  reloading = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onReload?: () => void;
  reloading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="mr-auto">
        <h1 className="text-xl font-bold tracking-tight text-fog">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-xs text-fog-faint">{subtitle}</p> : null}
      </div>
      {children}
      {onReload ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onReload}
          loading={reloading}
          aria-label="Reload"
        >
          <RefreshCw size={14} />
          Reload
        </Button>
      ) : null}
    </div>
  );
}
