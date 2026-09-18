'use client';

/**
 * Task detail + edit panel (`PATCH /admin/tasks/{task_id}` — PatchTaskRequest).
 *
 * UI convention: once a task's status is anything other than `not_sent` or
 * `scheduled`, every edit control is disabled. Note this freeze is
 * client-side only — the documented backend 400s cover just the scheduled
 * transition and schedule edits on non-scheduled tasks.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import type { PatchTaskRequest, TaskAdminResponse } from '@/lib/api-client/endpoints';
import { formatDateTime, isoToLocalInput, localInputToUtcIso } from '@/lib/format';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/inputs';
import { usePatchTask } from './hooks';

const EDITABLE_STATUSES = new Set(['not_sent', 'scheduled']);

export function TaskDetailPanel({
  task,
  readonly,
  onDirtyChange,
}: {
  task: TaskAdminResponse;
  readonly: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const patchTask = usePatchTask();
  const frozenByStatus = !EDITABLE_STATUSES.has(task.status ?? '');
  const disabled = readonly || frozenByStatus;

  const [response, setResponse] = useState(task.response ?? '');
  const [status, setStatus] = useState(task.status ?? '');
  const [sendTime, setSendTime] = useState(isoToLocalInput(task.send_time));
  const [responseTime, setResponseTime] = useState(isoToLocalInput(task.response_time));
  const [taskContext, setTaskContext] = useState(task.task_context ?? '');
  const [waitTime, setWaitTime] = useState(String(task.wait_time));
  const [waitTime2, setWaitTime2] = useState(String(task.wait_time_2));
  const [pullIp, setPullIp] = useState(task.client_pull_ip ?? '');
  const [responseIp, setResponseIp] = useState(task.client_response_ip ?? '');
  const [schedule, setSchedule] = useState(isoToLocalInput(task.schedule));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange(false);
    return () => onDirtyChange(false);
  }, [onDirtyChange]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !task.task_id) return;
    setLocalError(null);

    const toIso = (value: string): string | null | undefined => {
      if (!value) return null;
      const iso = localInputToUtcIso(value);
      if (!iso) throw new Error('invalid date');
      return iso;
    };

    let body: PatchTaskRequest;
    try {
      body = {
        response,
        status: status || undefined,
        send_time: toIso(sendTime),
        response_time: toIso(responseTime),
        task_context: taskContext,
        wait_time: Number(waitTime),
        wait_time_2: Number(waitTime2),
        client_pull_ip: pullIp || null,
        client_response_ip: responseIp || null,
        schedule: toIso(schedule),
      };
    } catch {
      setLocalError('One of the date fields is invalid.');
      return;
    }
    if (Number.isNaN(body.wait_time) || Number.isNaN(body.wait_time_2)) {
      setLocalError('Wait times must be numbers.');
      return;
    }

    patchTask.mutate(
      { taskId: task.task_id, body },
      { onSuccess: () => onDirtyChange(false) },
    );
  }

  return (
    <div className="space-y-4">
      {/* Read-only summary */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-ink-600 bg-ink-850/70 p-3 text-xs">
        <Meta label="Task ID" value={<span className="font-mono">{task.task_id}</span>} />
        <Meta label="Client" value={<span className="font-mono">{task.client_id ?? '—'}</span>} />
        <Meta label="Type" value={`${task.task_type_id} — ${task.task_type_name ?? ''}`} />
        <Meta label="Status" value={<StatusBadge value={task.status} />} />
        <Meta label="Creator" value={task.creator ?? '—'} />
        <Meta label="Created" value={formatDateTime(task.creation_time)} />
      </dl>

      <div>
        <p className="label-base">Full response</p>
        {disabled ? (
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-ink-600 bg-ink-900 p-3 font-mono text-xs leading-relaxed text-fog-dim">
            {task.response || 'No response recorded.'}
          </pre>
        ) : null}
      </div>

      {frozenByStatus ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
          Editing is disabled once a task leaves <span className="font-mono">not_sent</span> /{' '}
          <span className="font-mono">scheduled</span>.
        </p>
      ) : null}
      {readonly && !frozenByStatus ? (
        <p className="text-xs text-fog-faint">Read-only role — editing is disabled.</p>
      ) : null}

      {!disabled ? (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Response" htmlFor="td-response">
            <Textarea
              id="td-response"
              rows={4}
              value={response}
              onChange={(event) => setResponse(event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Status" htmlFor="td-status">
              <select
                id="td-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="input-base appearance-none pr-8"
              >
                {['not_sent', 'scheduled', 'sent', 'completed'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Schedule" htmlFor="td-schedule">
              <Input
                id="td-schedule"
                type="datetime-local"
                value={schedule}
                onChange={(event) => setSchedule(event.target.value)}
              />
            </Field>
            <Field label="Send time" htmlFor="td-send">
              <Input
                id="td-send"
                type="datetime-local"
                value={sendTime}
                onChange={(event) => setSendTime(event.target.value)}
              />
            </Field>
            <Field label="Response time" htmlFor="td-rt">
              <Input
                id="td-rt"
                type="datetime-local"
                value={responseTime}
                onChange={(event) => setResponseTime(event.target.value)}
              />
            </Field>
            <Field label="Wait time (s)" htmlFor="td-wait">
              <Input
                id="td-wait"
                type="number"
                min={0}
                value={waitTime}
                onChange={(event) => setWaitTime(event.target.value)}
              />
            </Field>
            <Field label="Wait time 2 (s)" htmlFor="td-wait2">
              <Input
                id="td-wait2"
                type="number"
                min={0}
                value={waitTime2}
                onChange={(event) => setWaitTime2(event.target.value)}
              />
            </Field>
            <Field label="Pull IP" htmlFor="td-pullip">
              <Input
                id="td-pullip"
                value={pullIp}
                onChange={(event) => setPullIp(event.target.value)}
              />
            </Field>
            <Field label="Response IP" htmlFor="td-respip">
              <Input
                id="td-respip"
                value={responseIp}
                onChange={(event) => setResponseIp(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Task context" htmlFor="td-context">
            <Textarea
              id="td-context"
              rows={3}
              value={taskContext}
              onChange={(event) => setTaskContext(event.target.value)}
            />
          </Field>

          {localError ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {localError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" loading={patchTask.isPending}>
              <Save size={14} />
              Save task
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-fog">{value}</dd>
    </div>
  );
}
