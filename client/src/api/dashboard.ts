import type { DashboardMetrics } from '../types/catalog';
import { apiRequest } from './client';

export const getDashboardMetrics = (): Promise<DashboardMetrics> =>
  apiRequest<DashboardMetrics>('/dashboard/metrics');
