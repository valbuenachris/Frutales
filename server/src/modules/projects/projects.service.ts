import { Prisma, type Project } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../utils/http-error.js';
import {
  QTY_DECIMALS,
  computeNetYield,
  computePaymentStatus,
  parseDateOnly,
  round,
} from './projects.calc.js';
import type { ProjectInput } from './projects.schema.js';

/** List all projects, newest first. */
export const listProjects = (): Promise<Project[]> =>
  prisma.project.findMany({ orderBy: { createdAt: 'desc' } });

/** Fetch one project or throw a 404. */
export async function getProject(id: string): Promise<Project> {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw notFound('Proyecto no encontrado');
  return project;
}

/** Create a project applying the net-yield business rule. */
export const createProject = (input: ProjectInput): Promise<Project> =>
  prisma.project.create({ data: buildWriteData(input) });

/** Replace all editable fields of an existing project (Phase 1 + Phase 2). */
export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  await getProject(id); // fail with 404 before hitting update
  return prisma.project.update({ where: { id }, data: buildWriteData(input) });
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
 * Phase 2: the Zod schema guarantees that either the full sale is present or
 * none of its fields are (sending none clears the sale), so `sellingPrice`
 * doubles as the "sale registered" flag here.
 */
function buildWriteData(input: ProjectInput): Prisma.ProjectUncheckedCreateInput {
  const overridden = input.netYieldOverridden === true;

  // When not overridden, the server recalculates the yield so the stored
  // value always matches initialQty/reductionPct.
  const netYield =
    overridden && input.netYield !== undefined
      ? round(input.netYield, QTY_DECIMALS)
      : computeNetYield(input.initialQty, input.reductionPct);

  const hasSale = input.sellingPrice !== undefined;

  const paymentType = hasSale ? (input.paymentType ?? null) : null;
  const transactionDate =
    hasSale && input.transactionDate ? parseDateOnly(input.transactionDate) : null;
  const scheduledPaymentDate =
    hasSale && input.paymentType === 'Crédito' && input.scheduledPaymentDate
      ? parseDateOnly(input.scheduledPaymentDate)
      : null;
  const buyerContact = hasSale && input.buyerContact ? input.buyerContact : null;

  return {
    // Fase 1
    name: input.name,
    productName: input.productName,
    processType: input.processType,
    initialQty: new Prisma.Decimal(round(input.initialQty, QTY_DECIMALS)),
    purchasePrice: new Prisma.Decimal(round(input.purchasePrice, 2)),
    reductionPct: new Prisma.Decimal(round(input.reductionPct, 2)),
    netYield: new Prisma.Decimal(netYield),
    netYieldOverridden: overridden,
    // Fase 2 (null when no sale is registered)
    sellingPrice: hasSale ? new Prisma.Decimal(round(input.sellingPrice ?? 0, 2)) : null,
    buyerName: hasSale ? (input.buyerName ?? null) : null,
    buyerContact,
    transactionDate,
    paymentType,
    scheduledPaymentDate,
    // Cached for querying; the mapper recomputes the live value on every read.
    paymentStatus: computePaymentStatus(paymentType, scheduledPaymentDate),
  };
}
