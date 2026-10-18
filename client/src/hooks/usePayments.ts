import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createProjectPayment,
  deleteProjectPayment,
  updateProjectPayment,
  type PaymentPayload,
} from '../api/projects';
import { projectKeys } from './useProjects';

/**
 * Payments change the derived paid amount, balance and payment status, so any
 * mutation invalidates the project queries AND the dashboard metrics.
 */
function useInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
  };
}

export function useCreatePayment(projectId: string) {
  const invalidate = useInvalidation(projectId);
  return useMutation({
    mutationFn: (payload: PaymentPayload) => createProjectPayment(projectId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdatePayment(projectId: string) {
  const invalidate = useInvalidation(projectId);
  return useMutation({
    mutationFn: ({ paymentId, payload }: { paymentId: string; payload: PaymentPayload }) =>
      updateProjectPayment(projectId, paymentId, payload),
    onSuccess: invalidate,
  });
}

export function useDeletePayment(projectId: string) {
  const invalidate = useInvalidation(projectId);
  return useMutation({
    mutationFn: (paymentId: string) => deleteProjectPayment(projectId, paymentId),
    onSuccess: invalidate,
  });
}
