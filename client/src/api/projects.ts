import type { Expense, Payment, Project, ProjectPayload, SaleCurrency } from '../types/project';
import { apiRequest } from './client';

/** Network layer for the projects resource (kept free of UI concerns). */

export const listProjects = (): Promise<Project[]> => apiRequest<Project[]>('/projects');

export const getProject = (id: string): Promise<Project> => apiRequest<Project>(`/projects/${id}`);

export const createProject = (payload: ProjectPayload): Promise<Project> =>
  apiRequest<Project>('/projects', { method: 'POST', body: JSON.stringify(payload) });

export const updateProject = (id: string, payload: ProjectPayload): Promise<Project> =>
  apiRequest<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteProject = (id: string): Promise<void> =>
  apiRequest<void>(`/projects/${id}`, { method: 'DELETE' });

/** Body for the nested expense endpoints. */
export interface ExpensePayload {
  concept: string;
  amount: number;
  /** "COP" (predeterminado) o "USD". */
  currency?: SaleCurrency;
  /** TRM (COP por USD); obligatoria para gastos en dólares. */
  exchangeRate?: number;
  /** Comprobante del gasto (data URL); omitir o "" para no tener imagen. */
  image?: string;
  /** "YYYY-MM-DD"; omit for "sin fecha". */
  date?: string;
}

export const createProjectExpense = (projectId: string, payload: ExpensePayload): Promise<Expense> =>
  apiRequest<Expense>(`/projects/${projectId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateProjectExpense = (
  projectId: string,
  expenseId: string,
  payload: ExpensePayload,
): Promise<Expense> =>
  apiRequest<Expense>(`/projects/${projectId}/expenses/${expenseId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteProjectExpense = (projectId: string, expenseId: string): Promise<void> =>
  apiRequest<void>(`/projects/${projectId}/expenses/${expenseId}`, { method: 'DELETE' });

/** Body for the nested payment (abono) endpoints. */
export interface PaymentPayload {
  amount: number;
  /** "COP" (predeterminado) o "USD". */
  currency?: SaleCurrency;
  /** TRM (COP por USD); obligatoria para pagos en dólares. */
  exchangeRate?: number;
  /** Nota u observación opcional. */
  note?: string;
  /** Comprobante del pago (data URL); omitir o "" para no tener imagen. */
  image?: string;
  /** "YYYY-MM-DD"; omit for "sin fecha". */
  date?: string;
}

export const createProjectPayment = (projectId: string, payload: PaymentPayload): Promise<Payment> =>
  apiRequest<Payment>(`/projects/${projectId}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateProjectPayment = (
  projectId: string,
  paymentId: string,
  payload: PaymentPayload,
): Promise<Payment> =>
  apiRequest<Payment>(`/projects/${projectId}/payments/${paymentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteProjectPayment = (projectId: string, paymentId: string): Promise<void> =>
  apiRequest<void>(`/projects/${projectId}/payments/${paymentId}`, { method: 'DELETE' });
