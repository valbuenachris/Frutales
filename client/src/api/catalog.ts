import { apiRequest } from './client';
import type { Client, Process, Product } from '../types/catalog';

/** CRUD API surface shared by every catalog resource. */
export interface CatalogApi<TItem> {
  list: () => Promise<TItem[]>;
  create: (input: Record<string, string>) => Promise<TItem>;
  update: (id: string, input: Record<string, string>) => Promise<TItem>;
  remove: (id: string) => Promise<void>;
}

const createCatalogApi = <TItem>(path: string): CatalogApi<TItem> => ({
  list: () => apiRequest<TItem[]>(path),
  create: (input) =>
    apiRequest<TItem>(path, { method: 'POST', body: JSON.stringify(input) }),
  update: (id, input) =>
    apiRequest<TItem>(`${path}/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id) => apiRequest<void>(`${path}/${id}`, { method: 'DELETE' }),
});

export const catalogsApi = {
  products: createCatalogApi<Product>('/products'),
  processes: createCatalogApi<Process>('/processes'),
  clients: createCatalogApi<Client>('/clients'),
};
