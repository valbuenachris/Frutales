import { Prisma, type Project } from '@prisma/client';
import {
  MONEY_DECIMALS,
  QTY_DECIMALS,
  computeNetProfit,
  computePaymentStatus,
  computeTotalCost,
  computeTotalRevenue,
  type PaymentStatus,
} from './projects.calc.js';

/** Shape returned by the API for a project (numbers, not Decimals). */
export interface ProjectDto {
  id: string;
  name: string;
  productName: string;
  processType: string;
  initialQty: number;
  purchasePrice: number;
  reductionPct: number;
  netYield: number;
  netYieldOverridden: boolean;
  // Fase 2: venta (null until the sale is registered)
  sellingPrice: number | null;
  buyerName: string | null;
  buyerContact: string | null;
  transactionDate: string | null;
  paymentType: string | null;
  scheduledPaymentDate: string | null;
  paymentStatus: PaymentStatus | null;
  // Derived totals (revenue/profit only exist once there is a sale)
  totalCost: number;
  totalRevenue: number | null;
  netProfit: number | null;
  createdAt: string;
  updatedAt: string;
}

const moneyToNumber = (value: Prisma.Decimal): number =>
  Number(value.toDecimalPlaces(MONEY_DECIMALS).toString());

const qtyToNumber = (value: Prisma.Decimal): number =>
  Number(value.toDecimalPlaces(QTY_DECIMALS).toString());

/**
 * Map a database row into the API DTO.
 * Derived values (totals and payment status) are computed here instead of
 * being trusted from storage, so they always reflect the current inputs and
 * the current date (a credit sale turns "Vencido" on its own).
 */
export function toProjectDto(project: Project): ProjectDto {
  const initialQty = qtyToNumber(project.initialQty);
  const purchasePrice = moneyToNumber(project.purchasePrice);
  const reductionPct = Number(project.reductionPct.toDecimalPlaces(2).toString());
  const netYield = qtyToNumber(project.netYield);

  const totalCost = computeTotalCost(initialQty, purchasePrice);

  // A sale exists once a selling price was registered. Legacy rows (created
  // before Phase 2 existed) keep computing revenue/profit as before.
  const hasSale = project.sellingPrice !== null;
  const sellingPrice = hasSale ? moneyToNumber(project.sellingPrice as Prisma.Decimal) : null;
  const totalRevenue = hasSale
    ? computeTotalRevenue(netYield, sellingPrice as number)
    : null;
  const netProfit = totalRevenue !== null ? computeNetProfit(totalRevenue, totalCost) : null;

  return {
    id: project.id,
    name: project.name,
    productName: project.productName,
    processType: project.processType,
    initialQty,
    purchasePrice,
    reductionPct,
    netYield,
    netYieldOverridden: project.netYieldOverridden,
    sellingPrice,
    buyerName: project.buyerName,
    buyerContact: project.buyerContact,
    transactionDate: project.transactionDate ? project.transactionDate.toISOString() : null,
    paymentType: project.paymentType,
    scheduledPaymentDate: project.scheduledPaymentDate
      ? project.scheduledPaymentDate.toISOString()
      : null,
    // Recomputed live; the stored column is only a cache for querying.
    paymentStatus: computePaymentStatus(project.paymentType, project.scheduledPaymentDate),
    totalCost,
    totalRevenue,
    netProfit,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
