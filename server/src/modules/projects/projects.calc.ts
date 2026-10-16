/**
 * Shared business rules for a project batch (Phase 1 + Phase 2).
 * Kept dependency-free so both the service and the mapper can use it,
 * and so the math is easy to unit-test.
 */

/** Decimal places for kg values (matches Decimal(12,3) columns). */
export const QTY_DECIMALS = 3;
/** Decimal places for money values (matches Decimal(12,2) columns). */
export const MONEY_DECIMALS = 2;

/** Round half-up to a fixed number of decimals, avoiding float dust (e.g. 0.30000000000000004). */
export const round = (value: number, decimals: number): number => Number(value.toFixed(decimals));

/**
 * Net yield = initial quantity * (1 - reduction% / 100).
 * Example: 10 kg with a 20% reduction -> 8 kg.
 */
export const computeNetYield = (initialQty: number, reductionPct: number): number =>
  round(initialQty * (1 - reductionPct / 100), QTY_DECIMALS);

/** Total cost = kg purchased * purchase price per kg. */
export const computeTotalCost = (initialQty: number, purchasePrice: number): number =>
  round(initialQty * purchasePrice, MONEY_DECIMALS);

/** Total revenue = kg of net yield * selling price per kg. */
export const computeTotalRevenue = (netYield: number, sellingPrice: number): number =>
  round(netYield * sellingPrice, MONEY_DECIMALS);

/** Net profit = total revenue - total cost (negative means loss). */
export const computeNetProfit = (totalRevenue: number, totalCost: number): number =>
  round(totalRevenue - totalCost, MONEY_DECIMALS);

// ---------------------------------------------------------------------------
// Fase 2: venta — payment types and status
// ---------------------------------------------------------------------------

export const PAYMENT_TYPES = ['Contado', 'Crédito'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_STATUSES = ['Pendiente', 'Pagado', 'Vencido'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * "YYYY-MM-DD" (native date input) -> Date stored at 12:00 UTC.
 * Noon UTC keeps the calendar day stable when clients format it in any
 * timezone (e.g. America/Bogota, UTC-5).
 */
export const parseDateOnly = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

/**
 * Payment status is always derived from the data (never trusted as input):
 *  - "Contado"                  -> "Pagado"
 *  - "Crédito" with a future (or today's) due date -> "Pendiente"
 *  - "Crédito" with a past due date                -> "Vencido"
 *  - no payment type            -> null (Phase 2 not registered yet)
 *
 * The due date is compared against the start of the current UTC day, so a
 * payment due today still counts as "Pendiente" until the day is over.
 */
export function computePaymentStatus(
  paymentType: string | null | undefined,
  scheduledPaymentDate: Date | null | undefined,
  now: Date = new Date(),
): PaymentStatus | null {
  if (paymentType === 'Contado') return 'Pagado';
  if (paymentType === 'Crédito') {
    if (!scheduledPaymentDate) return 'Pendiente'; // defensive; validated upstream
    const startOfTodayUtc = new Date(now);
    startOfTodayUtc.setUTCHours(0, 0, 0, 0);
    return scheduledPaymentDate.getTime() < startOfTodayUtc.getTime() ? 'Vencido' : 'Pendiente';
  }
  return null;
}
