import { Router } from 'express';
import * as controller from './expenses.controller.js';

/**
 * Nested REST routes for project expenses.
 * Mounted at /api/projects/:projectId/expenses — mergeParams exposes
 * `projectId` to the controllers.
 */
export const projectExpensesRouter = Router({ mergeParams: true });

projectExpensesRouter.get('/', controller.list);
projectExpensesRouter.post('/', controller.create);
projectExpensesRouter.put('/:expenseId', controller.update);
projectExpensesRouter.delete('/:expenseId', controller.remove);
