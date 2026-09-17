'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pendingClientsApi,
  type ConfirmPendingClientRequest,
  type PendingClientsQueryParams,
  type SearchParams,
} from '@/lib/api-client/endpoints';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { errorMessage, useToast } from '@/components/ui/toast';

export function usePendingClientsQuery(
  params: PendingClientsQueryParams | SearchParams,
  options: { search?: string } = {},
) {
  const { search } = options;
  return useLiveQuery({
    queryKey: ['pending-clients', search ? { q: search, ...params } : params],
    queryFn: () =>
      search
        ? pendingClientsApi.search({ ...(params as SearchParams), q: search })
        : pendingClientsApi.query(params as PendingClientsQueryParams),
  });
}

/** Confirm invalidates both this list and the Clients list. */
export function useConfirmPendingClient() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({
      clientId,
      body,
    }: {
      clientId: string;
      body: ConfirmPendingClientRequest;
    }) => pendingClientsApi.confirm(clientId, body),
    onSuccess: () => {
      toast.success('Client confirmed.');
      void queryClient.invalidateQueries({ queryKey: ['pending-clients'] });
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) =>
      toast.error(errorMessage(error, 'Could not confirm the client.')),
  });
}

export function useRejectPendingClient() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: pendingClientsApi.reject,
    onSuccess: () => {
      toast.success('Pending client rejected.');
      void queryClient.invalidateQueries({ queryKey: ['pending-clients'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) =>
      toast.error(errorMessage(error, 'Could not reject the client.')),
  });
}
