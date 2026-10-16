import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics } from '../api/dashboard';

/** KPI metrics for the dashboard (refetched when the window regains focus). */
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: getDashboardMetrics,
    refetchOnWindowFocus: true,
  });
}
