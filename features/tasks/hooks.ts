'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  tasksApi,
  taskTypesApi,
  type PatchTaskRequest,
  type SearchParams,
  type TasksQueryParams,
} from '@/lib/api-client/endpoints';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { errorMessage, useToast } from '@/components/ui/toast';

/** Plain `GET /admin/task-types` (full array) for task_type_id selects. */
export function useTaskTypeOptions() {
  return useQuery({
    queryKey: ['task-types', 'all'],
    queryFn: taskTypesApi.list,
    staleTime: 60_000,
  });
}

export function useTasksQuery(
  params: TasksQueryParams | SearchParams,
  options: { search?: string; paused?: boolean } = {},
) {
  const { search, paused } = options;
  return useLiveQuery({
    queryKey: ['tasks', search ? { q: search, ...params } : params],
    queryFn: () =>
      search
        ? tasksApi.search({ ...(params as SearchParams), q: search })
        : tasksApi.query(params as TasksQueryParams),
    paused,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      toast.success('Task created.');
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not create the task.')),
  });
}

export function usePatchTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: PatchTaskRequest }) =>
      tasksApi.patch(taskId, body),
    onSuccess: () => {
      toast.success('Task updated.');
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not update the task.')),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: tasksApi.remove,
    onSuccess: () => {
      toast.success('Task deleted.');
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not delete the task.')),
  });
}
