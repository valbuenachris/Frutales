/**
 * Live-calculated values shown in the form's summary card.
 * Mirrors the server rules in server/src/modules/projects/projects.calc.ts.
 */

export interface Totals {
  totalCost: number;
  /** null when the sale (Fase 2) has not been registered yet. */
  totalRevenue: number | null;
  /** null when the sale (Fase 2) has not been registered yet. */
  netProfit: number | null;
}

const round = (value: number, decimals: number): number => Number(value.toFixed(decimals));

/** Convert an input string to a number, tolerating comma decimals and blanks. */
export function parseNumber(value: string): number {
  const normalized = value.replace(',', '.').trim();
  if (normalized === '') return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Net yield = initial quantity * (1 - reduction% / 100). */
export function computeNetYield(initialQty: number, reductionPct: number): number {
  return round(initialQty * (1 - reductionPct / 100), 3);
}

/**
 * Cost, and (only when a sale price is provided) revenue and profit.
 * Pass `sellingPrice = null` while Fase 2 is not registered.
 */
export function computeTotals(
  netYield: number,
  initialQty: number,
  purchasePrice: number,
  sellingPrice: number | null,
): Totals {
  const totalCost = round(initialQty * purchasePrice, 2);
  if (sellingPrice === null) {
    return { totalCost, totalRevenue: null, netProfit: null };
  }
  const totalRevenue = round(netYield * sellingPrice, 2);
  return { totalCost, totalRevenue, netProfit: round(totalRevenue - totalCost, 2) };
}
