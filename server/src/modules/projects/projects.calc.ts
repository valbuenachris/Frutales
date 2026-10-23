/**
 * Shared business rules for a project batch (Phase 1 + Phase 2).
 * Kept dependency-free so both the service and the mapper can use it,
 * and so the math is easy to unit-test.
 */

/** Decimal places for gram values (matches Decimal(12,3) columns). */
export const QTY_DECIMALS = 3;
/** Decimal places for money values (matches Decimal(12,2) columns). */
export const MONEY_DECIMALS = 2;

/** Round half-up to a fixed number of decimals, avoiding float dust (e.g. 0.30000000000000004). */
export const round = (value: number, decimals: number): number => Number(value.toFixed(decimals));

/**
 * Net yield = initial quantity * (1 - reduction% / 100), rounded to whole
 * grams (only the reduction keeps decimals).
 * Example: 10.000 g with a 20% reduction -> 8.000 g.
 */
export const computeNetYield = (initialQty: number, reductionPct: number): number =>
  round(initialQty * (1 - reductionPct / 100), 0);

/**
 * Total purchase cost in COP = (grams purchased ÷ 1000) * purchase price per
 * kg * exchange rate. Purchases registered in USD are converted with the rate
 * captured at purchase time (`purchaseExchangeRate`); COP purchases use 1.
 */
export const computeTotalCost = (
  initialQty: number,
  purchasePrice: number,
  exchangeRate = 1,
): number => round((initialQty / 1000) * purchasePrice * exchangeRate, MONEY_DECIMALS);

/**
 * Total revenue in COP = (grams of net yield ÷ 1000) * selling price per kg *
 * exchange rate. Sales registered in USD are converted with the rate captured
 * at the moment of the sale (`exchangeRate`); COP sales pass the default 1.
 * Example: 8.000 g ÷ 1000 * $6.000/kg = $48.000.
 */
export const computeTotalRevenue = (
  netYield: number,
  sellingPrice: number,
  exchangeRate = 1,
): number => round((netYield / 1000) * sellingPrice * exchangeRate, MONEY_DECIMALS);

/** Net profit = total revenue - total cost (negative means loss). */
export const computeNetProfit = (totalRevenue: number, totalCost: number): number =>
  round(totalRevenue - totalCost, MONEY_DECIMALS);

// ---------------------------------------------------------------------------
// Fase 2: venta — payment types and status
// ---------------------------------------------------------------------------

export const PAYMENT_TYPES = ['Contado', 'Crédito'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_STATUSES = ['Pendiente', 'Abonado', 'Pagado', 'Vencido'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Context from the registered abonos/pagos (all COP-normalized). */
export interface PaymentStatusContext {
  /** COP revenue of the sale; null when there is no sale. */
  totalRevenue?: number | null;
  /** COP sum of the payments registered against the sale. */
  paidAmount?: number;
  /** Whether at least one payment is registered. */
  hasPayments?: boolean;
}

/**
 * "YYYY-MM-DD" (native date input) -> Date stored at 12:00 UTC.
 * Noon UTC keeps the calendar day stable when clients format it in any
 * timezone (e.g. America/Bogota, UTC-5).
 */
export const parseDateOnly = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

/**
 * Payment status is always derived from the data (never trusted as input):
 *  - fully covered by payments -> "Pagado"; "Contado" without any registered
 *    payment also counts as fully paid (legacy/automatic behavior, so a cash
 *    sale is "Pagado" unless the user starts recording parciales);
 *  - "Crédito" with a past due date and outstanding balance -> "Vencido";
 *  - some payments registered (outstanding balance) -> "Abonado";
 *  - otherwise -> "Pendiente".
 *  - no payment type -> null (Fase 2 not registered yet)
 *
 * The due date is compared against the start of the current UTC day, so a
 * payment due today still counts as pending until the day is over.
 */
export function computePaymentStatus(
  paymentType: string | null | undefined,
  scheduledPaymentDate: Date | null | undefined,
  context: PaymentStatusContext = {},
  now: Date = new Date(),
): PaymentStatus | null {
  if (!paymentType) return null;

  const { totalRevenue = null, paidAmount = 0, hasPayments = false } = context;

  // Fully paid: payments cover the revenue, or a cash sale with no payments.
  const coveredByPayments = totalRevenue !== null && paidAmount >= totalRevenue;
  const assumedCashPaid = !hasPayments && paymentType === 'Contado';
  if (coveredByPayments || assumedCashPaid) return 'Pagado';

  if (paymentType === 'Crédito' && scheduledPaymentDate) {
    const startOfTodayUtc = new Date(now);
    startOfTodayUtc.setUTCHours(0, 0, 0, 0);
    if (scheduledPaymentDate.getTime() < startOfTodayUtc.getTime()) return 'Vencido';
  }

  return paidAmount > 0 ? 'Abonado' : 'Pendiente';
}
