import type { Request, Response } from 'express';
import { paymentInputSchema, paymentParamsSchema } from './payments.schema.js';
import * as paymentsService from './payments.service.js';
import { toPaymentDto } from './projects.mapper.js';

/** Controllers only translate HTTP <-> service calls (nested under a project). */

/** GET /api/projects/:projectId/payments */
export async function list(req: Request, res: Response): Promise<void> {
  const { projectId } = paymentParamsSchema.parse(req.params);
  const payments = await paymentsService.listPayments(projectId);
  res.json({ data: payments.map((payment) => toPaymentDto(payment)) });
}

/** POST /api/projects/:projectId/payments */
export async function create(req: Request, res: Response): Promise<void> {
  const { projectId } = paymentParamsSchema.parse(req.params);
  const input = paymentInputSchema.parse(req.body);
  const payment = await paymentsService.createPayment(projectId, input);
  res.status(201).json({ data: toPaymentDto(payment) });
}

/** PUT /api/projects/:projectId/payments/:paymentId */
export async function update(req: Request, res: Response): Promise<void> {
  const { projectId, paymentId } = paymentParamsSchema.parse(req.params);
  const input = paymentInputSchema.parse(req.body);
  const payment = await paymentsService.updatePayment(projectId, paymentId as string, input);
  res.json({ data: toPaymentDto(payment) });
}

/** DELETE /api/projects/:projectId/payments/:paymentId */
export async function remove(req: Request, res: Response): Promise<void> {
  const { projectId, paymentId } = paymentParamsSchema.parse(req.params);
  await paymentsService.deletePayment(projectId, paymentId as string);
  res.status(204).send();
}
