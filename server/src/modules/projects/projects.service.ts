import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../utils/http-error.js';
import { resolveUsdCopRate } from '../exchange-rate/exchange-rate.service.js';
import {
  QTY_DECIMALS,
  computeNetYield,
  parseDateOnly,
  round,
} from './projects.calc.js';
import { toProjectDto, type ProjectWithRelations } from './projects.mapper.js';
import type { ProjectInput } from './projects.schema.js';

/** List all projects (with relations for the derived totals), newest first. */
export const listProjects = (): Promise<ProjectWithRelations[]> =>
  prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { expenses: true, payments: true },
  });

/** Fetch one project (with its relations) or throw a 404. */
export async function getProject(id: string): Promise<ProjectWithRelations> {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { expenses: true, payments: true },
  });
  if (!project) throw notFound('Proyecto no encontrado');
  return project;
}

/** Create a project applying the net-yield business rule. */
export async function createProject(input: ProjectInput): Promise<ProjectWithRelations> {
  const project = await prisma.project.create({
    data: await buildWriteData(input),
    include: { expenses: true, payments: true },
  });
  await persistPaymentStatusCache(project);
  return project;
}

/** Replace all editable fields of an existing project (Phase 1 + Phase 2). */
export async function updateProject(id: string, input: ProjectInput): Promise<ProjectWithRelations> {
  await getProject(id); // fail with 404 before hitting update
  const project = await prisma.project.update({
    where: { id },
    data: await buildWriteData(input),
    include: { expenses: true, payments: true },
  });
  await persistPaymentStatusCache(project);
  return project;
}

/** Delete a project. */
export async function deleteProject(id: string): Promise<void> {
  await getProject(id); // fail with 404 for unknown ids
  await prisma.project.delete({ where: { id } });
}

/**
 * Translate a validated DTO into Prisma write data.
 * Numbers are stored as Prisma Decimal to keep exact money/qty precision.
 *
 * Currency: purchases, sales and expenses each carry "COP" (default) or
 * "USD"; the exchange rate captured at registration time is stored next to
 * the amount so it becomes a permanent record (client value, or live TRM as
 * fallback).
 *
 * Phase 2: the Zod schema guarantees that either the full sale is present or
 * none of its fields are (sending none clears the sale), so `sellingPrice`
 * doubles as the "sale registered" flag here.
 */
async function buildWriteData(input: ProjectInput): Promise<Prisma.ProjectUncheckedCreateInput> {
  const overridden = input.netYieldOverridden === true;

  // When not overridden, the server recalculates the yield so the stored
  // value always matches initialQty/reductionPct.
  const netYield =
    overridden && input.netYield !== undefined
      ? round(input.netYield, QTY_DECIMALS)
      : computeNetYield(input.initialQty, input.reductionPct);

  // Fase 1: purchase currency, TRM (only for USD) and receipt image.
  const purchaseCurrency = input.purchaseCurrency ?? 'COP';
  const purchaseExchangeRate =
    purchaseCurrency === 'USD'
      ? new Prisma.Decimal(await resolveUsdCopRate(input.purchaseExchangeRate))
      : null;

  const hasSale = input.sellingPrice !== undefined;

  const paymentType = hasSale ? (input.paymentType ?? null) : null;
  const transactionDate =
    hasSale && input.transactionDate ? parseDateOnly(input.transactionDate) : null;
  const scheduledPaymentDate =
    hasSale && input.paymentType === 'Crédito' && input.scheduledPaymentDate
      ? parseDateOnly(input.scheduledPaymentDate)
      : null;
  const buyerContact = hasSale && input.buyerContact ? input.buyerContact : null;

  const currency = hasSale ? (input.currency ?? 'COP') : null;
  const exchangeRate =
    hasSale && currency === 'USD'
      ? new Prisma.Decimal(await resolveUsdCopRate(input.exchangeRate))
      : null;

  return {
    // Fase 1
    name: input.name,
    productName: input.productName,
    initialQty: new Prisma.Decimal(round(input.initialQty, QTY_DECIMALS)),
    purchasePrice: new Prisma.Decimal(round(input.purchasePrice, 2)),
    purchaseCurrency,
    purchaseExchangeRate,
    purchaseImage: cleanImage(input.purchaseImage),
    reductionPct: new Prisma.Decimal(round(input.reductionPct, 2)),
    netYield: new Prisma.Decimal(netYield),
    netYieldOverridden: overridden,
    // Fase 2 (null when no sale is registered)
    sellingPrice: hasSale ? new Prisma.Decimal(round(input.sellingPrice ?? 0, 2)) : null,
    currency,
    exchangeRate,
    saleImage: hasSale ? cleanImage(input.saleImage) : null,
    buyerName: hasSale ? (input.buyerName ?? null) : null,
    buyerContact,
    transactionDate,
    paymentType,
    scheduledPaymentDate,
  };
}

/**
 * Keep the cached paymentStatus column in sync with the live computation
 * (which also considers the registered abonos/pagos).
 */
async function persistPaymentStatusCache(project: ProjectWithRelations): Promise<void> {
  const { paymentStatus } = toProjectDto(project);
  if (paymentStatus !== project.paymentStatus) {
    project.paymentStatus = paymentStatus;
    await prisma.project.update({ where: { id: project.id }, data: { paymentStatus } });
  }
}

/** "" or undefined -> null; validated data URLs pass through. */
const cleanImage = (value: string | undefined): string | null => (value ? value : null);
