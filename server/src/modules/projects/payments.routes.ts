import { Router } from 'express';
import * as controller from './payments.controller.js';

/**
 * Nested REST routes for the abonos/pagos of a sale.
 * Mounted at /api/projects/:projectId/payments — mergeParams exposes
 * `projectId` to the controllers.
 */
export const projectPaymentsRouter = Router({ mergeParams: true });

projectPaymentsRouter.get('/', controller.list);
projectPaymentsRouter.post('/', controller.create);
projectPaymentsRouter.put('/:paymentId', controller.update);
projectPaymentsRouter.delete('/:paymentId', controller.remove);
