import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogsApi, type CatalogApi } from '../api/catalog';
import type { Client, Process, Product } from '../types/catalog';

/**
 * Factory that builds the four TanStack Query hooks for a catalog resource,
 * so Products/Processes/Clients share the same caching + invalidation logic.
 */
export function createCatalogHooks<TItem extends { id: string }>(key: string, api: CatalogApi<TItem>) {
  const allKey = [key] as const;

  const useList = () => useQuery({ queryKey: allKey, queryFn: api.list });

  const useCreate = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input: Record<string, string>) => api.create(input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: allKey }),
    });
  };

  const useUpdate = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, input }: { id: string; input: Record<string, string> }) =>
        api.update(id, input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: allKey }),
    });
  };

  const useDelete = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => api.remove(id),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: allKey }),
    });
  };

  return { useList, useCreate, useUpdate, useDelete };
}

export const productHooks = createCatalogHooks<Product>('products', catalogsApi.products);
export const processHooks = createCatalogHooks<Process>('processes', catalogsApi.processes);
export const clientHooks = createCatalogHooks<Client>('clients', catalogsApi.clients);
