import { apiRequest } from './client';
import type { User, UserCreateInput, UserUpdateInput } from '../types/auth';

/** CRUD de usuarios (solo administradores). */
export const usersApi = {
  list: () => apiRequest<User[]>('/users'),
  create: (input: UserCreateInput) =>
    apiRequest<User>('/users', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: UserUpdateInput) =>
    apiRequest<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id: string) => apiRequest<void>(`/users/${id}`, { method: 'DELETE' }),
};
