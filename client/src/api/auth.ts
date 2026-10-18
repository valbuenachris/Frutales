import { apiRequest } from './client';
import type { LoginInput, User } from '../types/auth';

/** Endpoints de sesión. */
export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<User>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  me: () => apiRequest<User>('/auth/me'),
};
