'use client';

/**
 * Task detail panel.
 *
 * Shows every field of the task. Only `task_context`, `wait_time`,
 * `wait_time_2` and `schedule` are admin-editable (matching the current
 * PatchTaskRequest). `status`, `send_time`, `response_time`, `response`,
 * `client_pull_ip` and `client_response_ip` are set by the server and are
 * displayed read-only.
 *
 * Once a task's status is `sent` or `completed` (anything outside
 * not_sent/scheduled), nothing is editable — but every detail stays visible.
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

  const [taskContext, setTaskContext] = useState(task.task_context ?? '');
  const [waitTime, setWaitTime] = useState(String(task.wait_time));
  const [waitTime2, setWaitTime2] = useState(String(task.wait_time_2));
  const [schedule, setSchedule] = useState(isoToLocalInput(task.schedule));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange(false);
    return () => onDirtyChange(false);
  }, [onDirtyChange]);

  const dirty =
    taskContext !== (task.task_context ?? '') ||
    waitTime !== String(task.wait_time) ||
    waitTime2 !== String(task.wait_time_2) ||
    schedule !== isoToLocalInput(task.schedule);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !task.task_id) return;
    setLocalError(null);

    const scheduleIso = schedule ? localInputToUtcIso(schedule) : null;
    if (schedule && !scheduleIso) {
      setLocalError('The schedule date is invalid.');
      return;
    }
    const body: PatchTaskRequest = {
      task_context: taskContext,
      wait_time: Number(waitTime),
      wait_time_2: Number(waitTime2),
      schedule: scheduleIso,
    };
    if (
      waitTime === '' ||
      waitTime2 === '' ||
      !Number.isInteger(body.wait_time) ||
      !Number.isInteger(body.wait_time_2)
    ) {
      setLocalError('Wait times must be whole numbers (milliseconds).');
      return;
    }

    patchTask.mutate(
      { taskId: task.task_id, body },
      { onSuccess: () => onDirtyChange(false) },
    );
  }

  return (
    <div className="space-y-4">
      {/* Read-only summary — always visible */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-ink-600 bg-ink-850/70 p-3 text-xs">
        <Meta label="Task ID" value={<span className="font-mono">{task.task_id}</span>} />
        <Meta label="Client" value={<span className="font-mono">{task.client_id ?? '—'}</span>} />
        <Meta label="Type" value={`${task.task_type_id} — ${task.task_type_name ?? ''}`} />
        <Meta label="Status" value={<StatusBadge value={task.status} />} />
        <Meta label="Creator" value={task.creator ?? '—'} />
        <Meta label="Created" value={formatDateTime(task.creation_time)} />
        <Meta label="Schedule" value={formatDateTime(task.schedule)} />
        <Meta label="Send time" value={formatDateTime(task.send_time)} />
        <Meta label="Response time" value={formatDateTime(task.response_time)} />
        <Meta label="Wait times (ms)" value={<span className="font-mono">{task.wait_time} / {task.wait_time_2}</span>} />
        <Meta label="Pull IP" value={<span className="font-mono">{task.client_pull_ip ?? '—'}</span>} />
        <Meta label="Response IP" value={<span className="font-mono">{task.client_response_ip ?? '—'}</span>} />
      </dl>

      <div>
        <p className="label-base">Task context</p>
        {disabled ? (
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-ink-600 bg-ink-900 p-3 font-mono text-xs leading-relaxed text-fog-dim">
            {task.task_context || 'No context provided.'}
          </pre>
        ) : (
          <Textarea
            aria-label="Task context"
            rows={3}
            value={taskContext}
            onChange={(event) => setTaskContext(event.target.value)}
          />
        )}
      </div>

      <div>
        <p className="label-base">Full response</p>
        <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-ink-600 bg-ink-900 p-3 font-mono text-xs leading-relaxed text-fog-dim">
          {task.response || 'No response recorded.'}
        </pre>
      </div>

      {frozenByStatus ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
          This task is <span className="font-mono">{task.status}</span> — every detail is now
          read-only. Status, times, IPs and the response are set by the server and never editable.
        </p>
      ) : readonly ? (
        <p className="text-xs text-fog-faint">Read-only role — task details cannot be modified.</p>
      ) : null}

      {!disabled ? (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Wait time (ms)" htmlFor="td-wait">
              <Input
                id="td-wait"
                type="number"
                min={0}
                step={1}
                value={waitTime}
                onChange={(event) => setWaitTime(event.target.value)}
              />
            </Field>
            <Field label="Wait time 2 (ms)" htmlFor="td-wait2">
              <Input
                id="td-wait2"
                type="number"
                min={0}
                step={1}
                value={waitTime2}
                onChange={(event) => setWaitTime2(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Schedule" htmlFor="td-schedule">
            <Input
              id="td-schedule"
              type="datetime-local"
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
            />
          </Field>

          {localError ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {localError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" disabled={!dirty} loading={patchTask.isPending}>
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
