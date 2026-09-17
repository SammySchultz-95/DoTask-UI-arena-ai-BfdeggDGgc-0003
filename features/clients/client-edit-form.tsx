'use client';

/**
 * Edit client panel (`PATCH /admin/clients/{client_id}` — PatchClientRequest).
 * `client_id` and `creation_time` are read-only.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import type { ClientResponse } from '@/lib/api-client/endpoints';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/inputs';
import { usePatchClient } from './hooks';

export function ClientEditForm({
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

  // Reset the form when a different row is selected or polling refreshes it.
  useEffect(() => {
    setClientName(client.client_name ?? '');
    setWaitTime(String(client.wait_time));
    setWaitTime2(String(client.wait_time_2));
    setStatus(client.status ?? '');
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
    patchClient.mutate(
      {
        clientId,
        body: {
          client_name: clientName,
          wait_time: Number(waitTime),
          wait_time_2: Number(waitTime2),
          status: status || undefined,
        },
      },
      { onSuccess: () => onDirtyChange(false) },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Client ID">
          <Input value={clientId} readOnly className="font-mono opacity-70" />
        </Field>
        <Field label="Created">
          <Input value={formatDateTime(client.creation_time)} readOnly className="opacity-70" />
        </Field>
      </div>
      <Field label="Client name" htmlFor="ce-name">
        <Input
          id="ce-name"
          value={clientName}
          disabled={readonly}
          onChange={(event) => setClientName(event.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Wait time (s)" htmlFor="ce-wait">
          <Input
            id="ce-wait"
            type="number"
            min={0}
            value={waitTime}
            disabled={readonly}
            onChange={(event) => setWaitTime(event.target.value)}
          />
        </Field>
        <Field label="Wait time 2 (s)" htmlFor="ce-wait2">
          <Input
            id="ce-wait2"
            type="number"
            min={0}
            value={waitTime2}
            disabled={readonly}
            onChange={(event) => setWaitTime2(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Status" htmlFor="ce-status" hint="Free-form status string as accepted by the API.">
        <Input
          id="ce-status"
          value={status}
          disabled={readonly}
          placeholder="e.g. active"
          onChange={(event) => setStatus(event.target.value)}
        />
      </Field>

      {!readonly ? (
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
      ) : (
        <p className="text-xs text-fog-faint">
          Read-only role — editing is disabled.
        </p>
      )}
    </form>
  );
}
