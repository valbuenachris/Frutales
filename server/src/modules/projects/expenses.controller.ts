import type { Request, Response } from 'express';
import { expenseInputSchema, expenseParamsSchema } from './expenses.schema.js';
import * as expensesService from './expenses.service.js';
import { toExpenseDto } from './projects.mapper.js';

/** Controllers only translate HTTP <-> service calls (nested under a project). */

/** GET /api/projects/:projectId/expenses */
export async function list(req: Request, res: Response): Promise<void> {
  const { projectId } = expenseParamsSchema.parse(req.params);
  const expenses = await expensesService.listExpenses(projectId);
  res.json({ data: expenses.map((expense) => toExpenseDto(expense)) });
}

/** POST /api/projects/:projectId/expenses */
export async function create(req: Request, res: Response): Promise<void> {
  const { projectId } = expenseParamsSchema.parse(req.params);
  const input = expenseInputSchema.parse(req.body);
  const expense = await expensesService.createExpense(projectId, input);
  res.status(201).json({ data: toExpenseDto(expense) });
}

/** PUT /api/projects/:projectId/expenses/:expenseId */
export async function update(req: Request, res: Response): Promise<void> {
  const { projectId, expenseId } = expenseParamsSchema.parse(req.params);
  const input = expenseInputSchema.parse(req.body);
  const expense = await expensesService.updateExpense(projectId, expenseId as string, input);
  res.json({ data: toExpenseDto(expense) });
}

/** DELETE /api/projects/:projectId/expenses/:expenseId */
export async function remove(req: Request, res: Response): Promise<void> {
  const { projectId, expenseId } = expenseParamsSchema.parse(req.params);
  await expensesService.deleteExpense(projectId, expenseId as string);
  res.status(204).send();
}
