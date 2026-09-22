'use client';

/**
 * "Add task" form (`POST /admin/tasks`). Reused by the Clients page (right
 * panel, client_id prefilled) and the Client Tasks page (top bar).
 *
 * wait_time / wait_time_2 are integer MILLISECONDS. Their defaults come from
 * the server config (`GET /admin/settings`). Selecting a task type shows its
 * description under the task context.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { serverConfigApi } from '@/lib/api-client/endpoints';
import { localInputToUtcIso } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/inputs';
import { useCreateTask, useTaskTypeOptions } from './hooks';

export function AddTaskForm({
  clientId,
  clientIdLocked = true,
  onCreated,
  compact = false,
}: {
  clientId: string;
  /** When true the client is fixed (Clients page); otherwise editable. */
  clientIdLocked?: boolean;
  onCreated?: () => void;
  compact?: boolean;
}) {
  const taskTypes = useTaskTypeOptions();
  const createTask = useCreateTask();

  // Server config supplies the default wait times for new tasks.
  const serverConfig = useQuery({
    queryKey: ['server-config'],
    queryFn: serverConfigApi.get,
    staleTime: 60_000,
  });

  const [clientIdValue, setClientIdValue] = useState(clientId);
  const [taskTypeId, setTaskTypeId] = useState('');
  const [waitTime, setWaitTime] = useState('');
  const [waitTime2, setWaitTime2] = useState('');
  const [taskContext, setTaskContext] = useState('');
  const [useSchedule, setUseSchedule] = useState(false);
  const [schedule, setSchedule] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Track whether the user touched the wait fields; otherwise prefill from
  // the server config once it loads.
  const waitTouched = useRef(false);
  const wait2Touched = useRef(false);

  useEffect(() => setClientIdValue(clientId), [clientId]);

  useEffect(() => {
    const config = serverConfig.data;
    if (!config) return;
    if (!waitTouched.current) {
      setWaitTime((current) => current || String(config.default_response_wait_time));
    }
    if (!wait2Touched.current) {
      setWaitTime2((current) => current || String(config.default_response_wait_time_2));
    }
  }, [serverConfig.data]);

  const selectedType = (taskTypes.data ?? []).find(
    (type) => String(type.task_type_id) === taskTypeId,
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    const parsedTaskTypeId = Number(taskTypeId);
    if (!taskTypeId || Number.isNaN(parsedTaskTypeId)) {
      setLocalError('Choose a task type.');
      return;
    }
    if (!clientIdValue.trim()) {
      setLocalError('client_id is required.');
      return;
    }
    const waitTimeNumber = Number(waitTime);
    const waitTime2Number = Number(waitTime2);
    if (
      waitTime === '' ||
      waitTime2 === '' ||
      !Number.isInteger(waitTimeNumber) ||
      !Number.isInteger(waitTime2Number)
    ) {
      setLocalError('Wait times must be whole numbers (milliseconds).');
      return;
    }
    let scheduleIso: string | undefined;
    if (useSchedule) {
      scheduleIso = localInputToUtcIso(schedule);
      if (!scheduleIso) {
        setLocalError('Pick a schedule date/time (submitted as ISO-8601 UTC).');
        return;
      }
    }

    createTask.mutate(
      {
        task_type_id: parsedTaskTypeId,
        client_id: clientIdValue.trim(),
        task_context: taskContext || undefined,
        wait_time: waitTimeNumber,
        wait_time_2: waitTime2Number,
        use_schedule: useSchedule,
        schedule: scheduleIso ?? null,
      },
      {
        onSuccess: () => {
          setTaskContext('');
          setUseSchedule(false);
          setSchedule('');
          onCreated?.();
        },
      },
    );
  }

  const gridCols = compact ? 'sm:grid-cols-4' : 'sm:grid-cols-2';

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className={`grid gap-3.5 ${gridCols}`}>
        <Field label="Client ID" htmlFor="at-client">
          <Input
            id="at-client"
            value={clientIdValue}
            readOnly={clientIdLocked}
            onChange={(event) => setClientIdValue(event.target.value)}
            placeholder="client-id"
            className={clientIdLocked ? 'font-mono opacity-70' : 'font-mono'}
          />
        </Field>
        <Field label="Task type" htmlFor="at-type">
          <Select
            id="at-type"
            value={taskTypeId}
            placeholder={taskTypes.isLoading ? 'Loading…' : 'Select…'}
            options={(taskTypes.data ?? []).map((type) => ({
              value: String(type.task_type_id),
              label: `${type.task_type_id} — ${type.task_type_name ?? ''}`,
            }))}
            onChange={(event) => setTaskTypeId(event.target.value)}
          />
        </Field>
        <Field label="Wait time (ms)" htmlFor="at-wait">
          <Input
            id="at-wait"
            type="number"
            min={0}
            step={1}
            value={waitTime}
            placeholder={serverConfig.isLoading ? '…' : 'default'}
            onChange={(event) => {
              waitTouched.current = true;
              setWaitTime(event.target.value);
            }}
          />
        </Field>
        <Field label="Wait time 2 (ms)" htmlFor="at-wait2">
          <Input
            id="at-wait2"
            type="number"
            min={0}
            step={1}
            value={waitTime2}
            placeholder={serverConfig.isLoading ? '…' : 'default'}
            onChange={(event) => {
              wait2Touched.current = true;
              setWaitTime2(event.target.value);
            }}
          />
        </Field>
      </div>

      <Field label="Task context" htmlFor="at-context">
        <Textarea
          id="at-context"
          rows={compact ? 2 : 3}
          value={taskContext}
          onChange={(event) => setTaskContext(event.target.value)}
          placeholder="Optional context sent to the client…"
        />
      </Field>

      {/* Description of the selected task type */}
      {selectedType ? (
        <div className="rounded-lg border border-neon-500/20 bg-neon-500/[0.05] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neon-300">
            {selectedType.task_type_name ?? `Task type ${selectedType.task_type_id}`} — description
          </p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-fog-dim">
            {selectedType.description || 'No description provided for this task type.'}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <Checkbox
          label="Use schedule"
          checked={useSchedule}
          onChange={setUseSchedule}
        />
        {useSchedule ? (
          <div className="min-w-[220px]">
            <label className="label-base" htmlFor="at-schedule">
              Schedule (sent as UTC)
            </label>
            <Input
              id="at-schedule"
              type="datetime-local"
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
            />
          </div>
        ) : null}
      </div>

      {localError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {localError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="sm" loading={createTask.isPending}>
          <Plus size={14} />
          Create task
        </Button>
      </div>
    </form>
  );
}
