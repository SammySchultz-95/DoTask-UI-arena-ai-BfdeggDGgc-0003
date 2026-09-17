'use client';

/**
 * Live-polling wrapper around TanStack Query.
 *
 * Every list in the panel polls every 5 seconds and exposes a manual
 * `refetch()`. While a detail-panel edit form is dirty we pause polling so a
 * background refetch doesn't re-render values out from under the user.
 */
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

export const POLL_INTERVAL_MS = 5000;

export interface LiveQueryOptions<T> {
  queryKey: readonly unknown[];
  queryFn: () => Promise<T>;
  /** Pause the 5s poll (e.g. while an edit form is dirty). */
  paused?: boolean;
  enabled?: boolean;
}

export function useLiveQuery<T>(options: LiveQueryOptions<T>): UseQueryResult<T> {
  const { queryKey, queryFn, paused = false, enabled = true } = options;
  return useQuery({
    queryKey,
    queryFn,
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: paused ? false : POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}
