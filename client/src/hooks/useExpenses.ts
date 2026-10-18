import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createProjectExpense,
  deleteProjectExpense,
  updateProjectExpense,
  type ExpensePayload,
} from '../api/projects';
import { projectKeys } from './useProjects';

/**
 * Expenses change the derived costs/profits, so any mutation invalidates the
 * project queries AND the dashboard metrics.
 */
function useInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
  };
}

export function useCreateExpense(projectId: string) {
  const invalidate = useInvalidation(projectId);
  return useMutation({
    mutationFn: (payload: ExpensePayload) => createProjectExpense(projectId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateExpense(projectId: string) {
  const invalidate = useInvalidation(projectId);
  return useMutation({
    mutationFn: ({ expenseId, payload }: { expenseId: string; payload: ExpensePayload }) =>
      updateProjectExpense(projectId, expenseId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteExpense(projectId: string) {
  const invalidate = useInvalidation(projectId);
  return useMutation({
    mutationFn: (expenseId: string) => deleteProjectExpense(projectId, expenseId),
    onSuccess: invalidate,
  });
}
