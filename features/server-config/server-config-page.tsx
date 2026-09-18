'use client';

/**
 * Server Config page — `GET/PATCH /api/v1/admin/settings`.
 *
 * All roles can view the configuration; only superadmin can modify it.
 * Values are the default wait times (ms) used for unregistered clients and
 * error responses; the API rejects values that are not > 0.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Save, Settings2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serverConfigApi } from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { canManage } from '@/lib/auth/roles';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { errorMessage, useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ErrorBlock, LoadingBlock } from '@/components/ui/empty-state';
import { Field, Input } from '@/components/ui/inputs';

export function ServerConfigPage() {
  const { role } = useAuth();
  const manage = canManage(role);
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useLiveQuery({
    queryKey: ['server-config'],
    queryFn: serverConfigApi.get,
  });
  const config = query.data;

  const [waitTime, setWaitTime] = useState('');
  const [waitTime2, setWaitTime2] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync the form whenever the (polled) config changes.
  useEffect(() => {
    if (config) {
      setWaitTime(String(config.default_response_wait_time));
      setWaitTime2(String(config.default_response_wait_time_2));
    }
  }, [config]);

  const dirty =
    !!config &&
    (waitTime !== String(config.default_response_wait_time) ||
      waitTime2 !== String(config.default_response_wait_time_2));

  const mutation = useMutation({
    mutationFn: () =>
      serverConfigApi.patch({
        default_response_wait_time: Number(waitTime),
        default_response_wait_time_2: Number(waitTime2),
      }),
    onSuccess: () => {
      toast.success('Server configuration updated.');
      void queryClient.invalidateQueries({ queryKey: ['server-config'] });
    },
    onError: (error) =>
      setLocalError(errorMessage(error, 'Could not update the server configuration.')),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    const a = Number(waitTime);
    const b = Number(waitTime2);
    if (Number.isNaN(a) || Number.isNaN(b) || a <= 0 || b <= 0) {
      setLocalError('Both wait times must be numbers greater than 0.');
      return;
    }
    mutation.mutate();
  }

  return (
    <>
      <PageHeader
        title="Server Config"
        subtitle="Global server settings — default wait times for pulls."
        onReload={() => void query.refetch()}
        reloading={query.isFetching}
      />

      {query.isError ? (
        <div className="panel">
          <ErrorBlock
            message={
              query.error instanceof Error
                ? query.error.message
                : 'Could not load the server configuration.'
            }
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : !config ? (
        <div className="panel">
          <LoadingBlock label="Loading configuration…" />
        </div>
      ) : (
        <div className="max-w-xl">
          <div className="panel p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neon-500/30 bg-neon-500/10 text-neon-400">
                <Settings2 size={17} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-fog">Default response wait times</h2>
                <p className="text-xs text-fog-faint">
                  Used for unregistered clients and error responses (milliseconds).
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="default_response_wait_time (ms)"
                  htmlFor="sc-wait"
                  hint="First wait time sent to clients."
                >
                  <Input
                    id="sc-wait"
                    type="number"
                    min={1}
                    value={waitTime}
                    disabled={!manage}
                    onChange={(event) => setWaitTime(event.target.value)}
                    className="font-mono"
                  />
                </Field>
                <Field
                  label="default_response_wait_time_2 (ms)"
                  htmlFor="sc-wait2"
                  hint="Second wait time sent to clients."
                >
                  <Input
                    id="sc-wait2"
                    type="number"
                    min={1}
                    value={waitTime2}
                    disabled={!manage}
                    onChange={(event) => setWaitTime2(event.target.value)}
                    className="font-mono"
                  />
                </Field>
              </div>

              {localError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {localError}
                </p>
              ) : null}

              {manage ? (
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm" disabled={!dirty} loading={mutation.isPending}>
                    <Save size={14} />
                    Save configuration
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-fog-faint">
                  Your role can view the server configuration but not modify it — superadmin only.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
