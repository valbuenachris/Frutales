import { Prisma, type Expense, type Payment, type Project } from '@prisma/client';
import {
  MONEY_DECIMALS,
  QTY_DECIMALS,
  computeNetProfit,
  computePaymentStatus,
  computeTotalCost,
  computeTotalRevenue,
  round,
  type PaymentStatus,
} from './projects.calc.js';

/** A project row with its relations included (required for derived totals). */
export type ProjectWithRelations = Project & { expenses: Expense[]; payments: Payment[] };

/** Expense as returned inside a project DTO. */
export interface ExpenseDto {
  id: string;
  concept: string;
  /** Amount in its original currency. */
  amount: number;
  /** "COP" | "USD" (legacy rows default to "COP"). */
  currency: string;
  /** COP per USD captured at registration (only for USD expenses). */
  exchangeRate: number | null;
  /** Amount converted to COP (for totals). */
  amountCop: number;
  date: string | null;
  /** Receipt data URL; only included in detail responses. */
  image: string | null;
  createdAt: string;
}

/** Abono / pago parcial as returned inside a project DTO. */
export interface PaymentDto {
  id: string;
  /** Amount in its original currency. */
  amount: number;
  /** "COP" | "USD" (legacy rows default to "COP"). */
  currency: string;
  /** COP per USD captured at registration (only for USD payments). */
  exchangeRate: number | null;
  /** Amount converted to COP (for the paid/balance totals). */
  amountCop: number;
  note: string | null;
  date: string | null;
  /** Receipt data URL; only included in detail responses. */
  image: string | null;
  createdAt: string;
}

/** Shape returned by the API for a project (numbers, not Decimals). */
export interface ProjectDto {
  id: string;
  name: string;
  productName: string;
  processType: string;
  initialQty: number;
  purchasePrice: number;
  /** "COP" | "USD" (legacy rows default to "COP"). */
  purchaseCurrency: string;
  /** COP per USD captured when the purchase was made in USD. */
  purchaseExchangeRate: number | null;
  reductionPct: number;
  netYield: number;
  netYieldOverridden: boolean;
  // Fase 2: venta (null until the sale is registered)
  sellingPrice: number | null;
  /** "COP" | "USD" (legacy rows default to "COP"); null when there is no sale. */
  currency: string | null;
  /** COP per USD captured when the USD sale was registered. */
  exchangeRate: number | null;
  buyerName: string | null;
  buyerContact: string | null;
  transactionDate: string | null;
  paymentType: string | null;
  scheduledPaymentDate: string | null;
  paymentStatus: PaymentStatus | null;
  // Comprobantes (data URLs); only included in detail responses.
  purchaseImage: string | null;
  saleImage: string | null;
  // Gastos del proyecto
  expenses: ExpenseDto[];
  /** Sum of all expense amounts, normalized to COP. */
  expensesTotal: number;
  /** Abonos/pagos parciales de la venta. */
  payments: PaymentDto[];
  /**
   * Total paid (COP). A "Contado" sale without registered payments counts as
   * fully paid (legacy/automatic behavior).
   */
  paidAmount: number;
  /** Outstanding balance (revenue − paidAmount); null when there is no sale. */
  balance: number | null;
  /** Cost of the raw material alone, normalized to COP. */
  purchaseCost: number;
  /** Total cost = purchaseCost + expensesTotal (COP). */
  totalCost: number;
  // Derived totals (revenue/profit only exist once there is a sale)
  totalRevenue: number | null;
  netProfit: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Options for the mapper: list responses strip the (heavy) receipt images. */
export interface ProjectDtoOptions {
  includeImages?: boolean;
}

const moneyToNumber = (value: Prisma.Decimal): number =>
  Number(value.toDecimalPlaces(MONEY_DECIMALS).toString());

const qtyToNumber = (value: Prisma.Decimal): number =>
  Number(value.toDecimalPlaces(QTY_DECIMALS).toString());

const rateToNumber = (value: Prisma.Decimal | null): number | null =>
  value ? Number(value.toDecimalPlaces(4).toString()) : null;

/** Convert an expense (amount + currency + rate) to its DTO. */
export const toExpenseDto = (expense: Expense, includeImage = true): ExpenseDto => {
  const amount = moneyToNumber(expense.amount);
  const currency = expense.currency ?? 'COP';
  const exchangeRate = rateToNumber(expense.exchangeRate);
  const conversion = currency === 'USD' && exchangeRate !== null ? exchangeRate : 1;
  return {
    id: expense.id,
    concept: expense.concept,
    amount,
    currency,
    exchangeRate,
    amountCop: round(amount * conversion, MONEY_DECIMALS),
    date: expense.date ? expense.date.toISOString() : null,
    image: includeImage ? expense.image : null,
    createdAt: expense.createdAt.toISOString(),
  };
};

/** Convert a payment (amount + currency + rate) to its DTO. */
export const toPaymentDto = (payment: Payment, includeImage = true): PaymentDto => {
  const amount = moneyToNumber(payment.amount);
  const currency = payment.currency ?? 'COP';
  const exchangeRate = rateToNumber(payment.exchangeRate);
  const conversion = currency === 'USD' && exchangeRate !== null ? exchangeRate : 1;
  return {
    id: payment.id,
    amount,
    currency,
    exchangeRate,
    amountCop: round(amount * conversion, MONEY_DECIMALS),
    note: payment.note,
    date: payment.date ? payment.date.toISOString() : null,
    image: includeImage ? payment.image : null,
    createdAt: payment.createdAt.toISOString(),
  };
};

/**
 * Map a database row into the API DTO.
 * Derived values (totals, paid amount, balance and payment status) are
 * computed here instead of being trusted from storage, so they always reflect
 * the current inputs, payments and date.
 *
 * All money enters the totals normalized to COP using the historical rate
 * stored with each USD entry.
 */
export function toProjectDto(
  project: ProjectWithRelations,
  options: ProjectDtoOptions = {},
): ProjectDto {
  const includeImages = options.includeImages === true;

  const initialQty = qtyToNumber(project.initialQty);
  const purchasePrice = moneyToNumber(project.purchasePrice);
  const reductionPct = Number(project.reductionPct.toDecimalPlaces(2).toString());
  const netYield = qtyToNumber(project.netYield);

  // Fase 1: purchase in COP or USD (converted with its historical rate).
  const purchaseCurrency = project.purchaseCurrency ?? 'COP';
  const purchaseExchangeRate = rateToNumber(project.purchaseExchangeRate);
  const purchaseConversion =
    purchaseCurrency === 'USD' && purchaseExchangeRate !== null ? purchaseExchangeRate : 1;
  const purchaseCost = computeTotalCost(initialQty, purchasePrice, purchaseConversion);

  // Gastos: each one normalized to COP, then summed.
  const expenses = project.expenses.map((expense) => toExpenseDto(expense, includeImages));
  const expensesTotal = round(
    expenses.reduce((sum, expense) => sum + expense.amountCop, 0),
    MONEY_DECIMALS,
  );
  const totalCost = round(purchaseCost + expensesTotal, MONEY_DECIMALS);

  // A sale exists once a selling price was registered. Legacy rows (created
  // before Phase 2 existed) keep computing revenue/profit as before.
  const hasSale = project.sellingPrice !== null;
  const sellingPrice = hasSale ? moneyToNumber(project.sellingPrice as Prisma.Decimal) : null;
  const currency = hasSale ? (project.currency ?? 'COP') : null;
  const exchangeRate = rateToNumber(project.exchangeRate);
  const conversion = currency === 'USD' && exchangeRate !== null ? exchangeRate : 1;
  const totalRevenue = hasSale
    ? computeTotalRevenue(netYield, sellingPrice as number, conversion)
    : null;
  const netProfit = totalRevenue !== null ? computeNetProfit(totalRevenue, totalCost) : null;

  // Abonos/pagos parciales (normalized to COP).
  const payments = project.payments.map((payment) => toPaymentDto(payment, includeImages));
  const paymentsTotal = round(
    payments.reduce((sum, payment) => sum + payment.amountCop, 0),
    MONEY_DECIMALS,
  );
  // Legacy/automatic behavior: a cash sale with no registered payments counts
  // as fully paid. As soon as payments are registered, they rule the status.
  const assumedCashPaid = payments.length === 0 && project.paymentType === 'Contado';
  const paidAmount =
    totalRevenue !== null && assumedCashPaid ? totalRevenue : paymentsTotal;
  const balance = totalRevenue !== null ? round(totalRevenue - paidAmount, MONEY_DECIMALS) : null;

  return {
    id: project.id,
    name: project.name,
    productName: project.productName,
    processType: project.processType,
    initialQty,
    purchasePrice,
    purchaseCurrency,
    purchaseExchangeRate,
    reductionPct,
    netYield,
    netYieldOverridden: project.netYieldOverridden,
    sellingPrice,
    currency,
    exchangeRate,
    buyerName: project.buyerName,
    buyerContact: project.buyerContact,
    transactionDate: project.transactionDate ? project.transactionDate.toISOString() : null,
    paymentType: project.paymentType,
    scheduledPaymentDate: project.scheduledPaymentDate
      ? project.scheduledPaymentDate.toISOString()
      : null,
    // Recomputed live (stored column is only a cache for SQL consumers).
    paymentStatus: computePaymentStatus(project.paymentType, project.scheduledPaymentDate, {
      totalRevenue,
      paidAmount,
      hasPayments: payments.length > 0,
    }),
    purchaseImage: includeImages ? project.purchaseImage : null,
    saleImage: includeImages ? project.saleImage : null,
    expenses,
    expensesTotal,
    payments,
    paidAmount,
    balance,
    purchaseCost,
    totalCost,
    totalRevenue,
    netProfit,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
