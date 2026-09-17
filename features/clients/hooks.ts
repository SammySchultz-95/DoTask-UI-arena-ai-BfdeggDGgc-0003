'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  clientsApi,
  type ClientsQueryParams,
  type PatchClientRequest,
  type SearchParams,
} from '@/lib/api-client/endpoints';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { errorMessage, useToast } from '@/components/ui/toast';

export function useClientsQuery(
  params: ClientsQueryParams | SearchParams,
  options: { search?: string; paused?: boolean } = {},
) {
  const { search, paused } = options;
  return useLiveQuery({
    queryKey: ['clients', search ? { q: search, ...params } : params],
    queryFn: () =>
      search
        ? clientsApi.search({ ...(params as SearchParams), q: search })
        : clientsApi.query(params as ClientsQueryParams),
    paused,
  });
}

export function usePatchClient() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({
      clientId,
      body,
    }: {
      clientId: string;
      body: PatchClientRequest;
    }) => clientsApi.patch(clientId, body),
    onSuccess: () => {
      toast.success('Client updated.');
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) =>
      toast.error(errorMessage(error, 'Could not update the client.')),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: clientsApi.remove,
    onSuccess: () => {
      toast.success('Client deleted.');
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) =>
      toast.error(errorMessage(error, 'Could not delete the client.')),
  });
}
