'use client';

/**
 * Client Info panel — shows every field of a ClientResponse.
 *
 * Read-only for everyone: client_id, creation_time, last_check_in,
 * requests_count, client_ip_stack, last_max_wait_time, online_status.
 * Changeable (superadmin + normaladmin): client_name, status (select),
 * wait_time, wait_time_2 — saved via `PATCH /admin/clients/{client_id}`.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import type { ClientResponse } from '@/lib/api-client/endpoints';
import { formatDateTime } from '@/lib/format';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/inputs';
import { usePatchClient } from './hooks';

const CLIENT_STATUS_OPTIONS = [
  { value: 'running', label: 'running' },
  { value: 'shutdown', label: 'shutdown' },
  { value: 'suspended', label: 'suspended' },
];

export function ClientInfoPanel({
  client,
  readonly,
  onDirtyChange,
}: {
  client: ClientResponse;
  readonly: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const patchClient = usePatchClient();
  const clientId = client.client_id ?? '';

  const [clientName, setClientName] = useState(client.client_name ?? '');
  const [waitTime, setWaitTime] = useState(String(client.wait_time));
  const [waitTime2, setWaitTime2] = useState(String(client.wait_time_2));
  const [status, setStatus] = useState(client.status ?? '');
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form when a different row is selected.
  useEffect(() => {
    setClientName(client.client_name ?? '');
    setWaitTime(String(client.wait_time));
    setWaitTime2(String(client.wait_time_2));
    setStatus(client.status ?? '');
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const dirty =
    clientName !== (client.client_name ?? '') ||
    waitTime !== String(client.wait_time) ||
    waitTime2 !== String(client.wait_time_2) ||
    status !== (client.status ?? '');

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!clientId) return;
    const wait = Number(waitTime);
    const wait2 = Number(waitTime2);
    if (waitTime === '' || waitTime2 === '' || !Number.isInteger(wait) || !Number.isInteger(wait2)) {
      setFormError('Wait times must be whole numbers (milliseconds).');
      return;
    }
    setFormError(null);
    patchClient.mutate(
      {
        clientId,
        body: {
          client_name: clientName,
          wait_time: wait,
          wait_time_2: wait2,
          status: status || undefined,
        },
      },
      { onSuccess: () => onDirtyChange(false) },
    );
  }

  const ipStack = client.client_ip_stack ?? [];

  return (
    <div className="space-y-4">
      {/* Read-only information */}
      <dl className="space-y-2 rounded-lg border border-ink-600 bg-ink-850/70 p-3 text-xs">
        <InfoRow label="Client ID" value={<span className="font-mono">{clientId || '—'}</span>} />
        <InfoRow label="Created" value={formatDateTime(client.creation_time)} />
        <InfoRow label="Last check-in" value={formatDateTime(client.last_check_in)} />
        <InfoRow
          label="Requests count"
          value={<span className="font-mono">{client.requests_count}</span>}
        />
        <InfoRow
          label="Last max wait time"
          value={<span className="font-mono">{client.last_max_wait_time} ms</span>}
        />
        <InfoRow label="Online status" value={<StatusBadge value={client.online_status} />} />
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">
            Client IP stack
          </dt>
          <dd className="mt-1">
            {ipStack.length === 0 ? (
              <span className="text-fog-faint">—</span>
            ) : (
              <ul className="space-y-0.5">
                {ipStack.map((ip, index) => (
                  <li key={`${ip}-${index}`} className="font-mono text-fog-dim">
                    {ip}
                    {index === 0 ? (
                      <span className="ml-2 rounded bg-neon-500/10 px-1 py-0.5 text-[9px] uppercase tracking-wider text-neon-300">
                        latest
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      {/* Changeable fields */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Field label="Client name" htmlFor="ci-name">
          <Input
            id="ci-name"
            value={clientName}
            disabled={readonly}
            onChange={(event) => setClientName(event.target.value)}
          />
        </Field>
        <Field label="Status" htmlFor="ci-status">
          <Select
            id="ci-status"
            value={status}
            disabled={readonly}
            placeholder={status ? undefined : '—'}
            options={CLIENT_STATUS_OPTIONS}
            onChange={(event) => setStatus(event.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Wait time (ms)" htmlFor="ci-wait">
            <Input
              id="ci-wait"
              type="number"
              min={0}
              step={1}
              value={waitTime}
              disabled={readonly}
              onChange={(event) => setWaitTime(event.target.value)}
            />
          </Field>
          <Field label="Wait time 2 (ms)" htmlFor="ci-wait2">
            <Input
              id="ci-wait2"
              type="number"
              min={0}
              step={1}
              value={waitTime2}
              disabled={readonly}
              onChange={(event) => setWaitTime2(event.target.value)}
            />
          </Field>
        </div>

        {formError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {formError}
          </p>
        ) : null}

        {readonly ? (
          <p className="text-xs text-fog-faint">
            Read-only role — client information cannot be modified.
          </p>
        ) : (
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!dirty}
              loading={patchClient.isPending}
            >
              <Save size={14} />
              Save changes
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">
        {label}
      </dt>
      <dd className="min-w-0 break-all text-right">{value}</dd>
    </div>
  );
}
