import { Prisma, type Expense } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../utils/http-error.js';
import { resolveUsdCopRate } from '../exchange-rate/exchange-rate.service.js';
import { parseDateOnly } from './projects.calc.js';
import type { ExpenseInput } from './expenses.schema.js';

/** Verify the parent project exists (throws 404 otherwise). */
async function assertProjectExists(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) throw notFound('Proyecto no encontrado');
}

/** List the expenses of a project, newest first. */
export async function listExpenses(projectId: string): Promise<Expense[]> {
  await assertProjectExists(projectId);
  return prisma.expense.findMany({
    where: { projectId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

/** Create an expense inside a project. */
export async function createExpense(projectId: string, input: ExpenseInput): Promise<Expense> {
  await assertProjectExists(projectId);
  return prisma.expense.create({ data: { projectId, ...(await buildWriteData(input)) } });
}

/** Update an expense (must belong to the given project). */
export async function updateExpense(
  projectId: string,
  expenseId: string,
  input: ExpenseInput,
): Promise<Expense> {
  await getExpense(projectId, expenseId);
  return prisma.expense.update({ where: { id: expenseId }, data: await buildWriteData(input) });
}

/** Delete an expense (must belong to the given project). */
export async function deleteExpense(projectId: string, expenseId: string): Promise<void> {
  await getExpense(projectId, expenseId);
  await prisma.expense.delete({ where: { id: expenseId } });
}

/** Fetch one expense scoped to its project or throw a 404. */
async function getExpense(projectId: string, expenseId: string): Promise<Expense> {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, projectId } });
  if (!expense) throw notFound('Gasto no encontrado');
  return expense;
}

/**
 * Currency: "COP" (default) or "USD"; USD expenses keep the rate captured at
 * registration (client value or live TRM fallback). "" clears the image.
 */
const buildWriteData = async (input: ExpenseInput) => {
  const currency = input.currency ?? 'COP';
  const exchangeRate =
    currency === 'USD' ? new Prisma.Decimal(await resolveUsdCopRate(input.exchangeRate)) : null;
  return {
    concept: input.concept,
    amount: new Prisma.Decimal(input.amount),
    currency,
    exchangeRate,
    image: input.image ? input.image : null,
    date: input.date ? parseDateOnly(input.date) : null,
  };
};
