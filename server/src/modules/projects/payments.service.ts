import { Prisma, type Payment } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError, notFound } from '../../utils/http-error.js';
import { resolveUsdCopRate } from '../exchange-rate/exchange-rate.service.js';
import { parseDateOnly } from './projects.calc.js';
import { toProjectDto } from './projects.mapper.js';
import type { PaymentInput } from './payments.schema.js';

/** Payments only make sense once the sale (Fase 2) exists. */
async function assertSaleExists(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, sellingPrice: true },
  });
  if (!project) throw notFound('Proyecto no encontrado');
  if (project.sellingPrice === null) {
    throw new HttpError(400, 'Primero registra la venta (Fase 2) antes de agregar abonos o pagos.');
  }
}

/** List the abonos/pagos of a project's sale, newest first. */
export async function listPayments(projectId: string): Promise<Payment[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw notFound('Proyecto no encontrado');
  return prisma.payment.findMany({
    where: { projectId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

/** Register an abono/pago parcial. */
export async function createPayment(projectId: string, input: PaymentInput): Promise<Payment> {
  await assertSaleExists(projectId);
  const payment = await prisma.payment.create({
    data: { projectId, ...(await buildWriteData(input)) },
  });
  await refreshPaymentStatusCache(projectId);
  return payment;
}

/** Update an abono (must belong to the given project). */
export async function updatePayment(
  projectId: string,
  paymentId: string,
  input: PaymentInput,
): Promise<Payment> {
  await getPayment(projectId, paymentId);
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: await buildWriteData(input),
  });
  await refreshPaymentStatusCache(projectId);
  return payment;
}

/** Delete an abono (must belong to the given project). */
export async function deletePayment(projectId: string, paymentId: string): Promise<void> {
  await getPayment(projectId, paymentId);
  await prisma.payment.delete({ where: { id: paymentId } });
  await refreshPaymentStatusCache(projectId);
}

/** Fetch one payment scoped to its project or throw a 404. */
async function getPayment(projectId: string, paymentId: string): Promise<Payment> {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, projectId } });
  if (!payment) throw notFound('Pago no encontrado');
  return payment;
}

/** Currency/rate/receipt handling mirrors expenses. "" clears the image. */
const buildWriteData = async (input: PaymentInput) => {
  const currency = input.currency ?? 'COP';
  const exchangeRate =
    currency === 'USD' ? new Prisma.Decimal(await resolveUsdCopRate(input.exchangeRate)) : null;
  return {
    amount: new Prisma.Decimal(input.amount),
    currency,
    exchangeRate,
    note: input.note ? input.note : null,
    image: input.image ? input.image : null,
    date: input.date ? parseDateOnly(input.date) : null,
  };
};

/**
 * Keep the cached paymentStatus column in sync after a payment changes
 * (the API always recomputes the live status on read; the column is only a
 * cache for direct SQL consumers).
 */
async function refreshPaymentStatusCache(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { expenses: true, payments: true },
  });
  if (!project) return;
  const { paymentStatus } = toProjectDto(project);
  await prisma.project.update({ where: { id: projectId }, data: { paymentStatus } });
}
