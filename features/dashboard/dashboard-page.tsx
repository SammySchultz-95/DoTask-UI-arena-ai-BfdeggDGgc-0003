'use client';

import Link from 'next/link';
import {
  Clock4,
  Download,
  MonitorSmartphone,
  Upload,
  ListTodo,
} from 'lucide-react';
import { dashboardApi } from '@/lib/api-client/endpoints';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { ErrorBlock, LoadingBlock } from '@/components/ui/empty-state';

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Clock4;
  label: string;
  value: number | undefined;
  href: string;
}) {
  return (
    <Link href={href} className="panel group flex items-center gap-4 p-5 transition hover:border-neon-500/40">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-500/30 bg-neon-500/10 text-neon-400 shadow-glow-sm">
        <Icon size={20} />
      </span>
      <div>
        <p className="text-3xl font-bold tabular-nums text-fog">
          {value === undefined ? '—' : value.toLocaleString()}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-faint group-hover:text-neon-300">
          {label}
        </p>
      </div>
    </Link>
  );
}

function StatusBreakdown({
  title,
  icon: Icon,
  data,
}: {
  title: string;
  icon: typeof MonitorSmartphone;
  data: Record<string, number> | null | undefined;
}) {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const max = Math.max(1, ...entries.map(([, count]) => count));

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <Icon size={16} className="text-neon-400" />
        <h2 className="text-sm font-semibold text-fog">{title}</h2>
        <span className="ml-auto font-mono text-xs text-fog-faint">
          {total.toLocaleString()} total
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="py-6 text-center text-xs text-fog-faint">No data yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {entries.map(([status, count]) => (
            <li key={status} className="flex items-center gap-3">
              <div className="w-28 shrink-0">
                <StatusBadge value={status} />
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-600">
                <div
                  className="h-full rounded-full bg-neon-gradient shadow-glow-sm transition-all duration-500"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-fog-dim">
                {count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DashboardPage() {
  const query = useLiveQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
  });

  const summary = query.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview — refreshes every 5 seconds."
        onReload={() => void query.refetch()}
        reloading={query.isFetching}
      />

      {query.isError ? (
        <div className="panel">
          <ErrorBlock
            message={
              query.error instanceof Error
                ? query.error.message
                : 'Could not load the dashboard summary.'
            }
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : !summary ? (
        <div className="panel">
          <LoadingBlock label="Loading summary…" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Clock4}
              label="Pending clients"
              value={summary.pending_clients}
              href="/pending-clients"
            />
            <StatCard
              icon={Download}
              label="Active download links"
              value={summary.active_download_links}
              href="/downloads"
            />
            <StatCard
              icon={Upload}
              label="Active upload links"
              value={summary.active_upload_links}
              href="/uploads"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StatusBreakdown
              title="Clients by status"
              icon={MonitorSmartphone}
              data={summary.clients_by_status}
            />
            <StatusBreakdown
              title="Tasks by status"
              icon={ListTodo}
              data={summary.tasks_by_status}
            />
          </div>
        </div>
      )}
    </>
  );
}
