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

/**
 * Convierte un texto numérico en formato es-CO a número:
 *  - con coma: la coma es el decimal y los puntos son miles
 *    ("3.598.998.323,87" -> 3598998323.87)
 *  - sin coma: un punto con grupos de 3 dígitos es separador de miles
 *    ("1.234" -> 1234, "1.234.567" -> 1234567); en otro caso es decimal
 *    ("2.5" -> 2.5, "12.34" -> 12.34)
 *  - vacío o inválido -> 0
 */
export function parseNumber(value: string): number {
  const trimmed = value.trim();
  if (trimmed === '') return 0;

  let normalized: string;
  if (trimmed.includes(',')) {
    normalized = trimmed.replaceAll('.', '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    normalized = trimmed.replaceAll('.', '');
  } else {
    normalized = trimmed;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Net yield = initial quantity * (1 - reduction% / 100), rounded to whole
 * grams (only the reduction keeps decimals).
 */
export function computeNetYield(initialQty: number, reductionPct: number): number {
  return round(initialQty * (1 - reductionPct / 100), 0);
}

/**
 * Cost, and (only when a sale price is provided) revenue and profit.
 * Pass `sellingPrice = null` while Fase 2 is not registered.
 *
 * `totalCost` is ONLY the purchase ((initialQty ÷ 1000) × purchasePrice).
 * Registered expenses (`expensesTotal`) are subtracted from the profit and are
 * summed separately for the per-gram cost line: (totalCost + expensesTotal) / netYield.
 */
export function computeTotals(
  netYield: number,
  initialQty: number,
  purchasePrice: number,
  sellingPrice: number | null,
  expensesTotal = 0,
): Totals {
  // Cantidades en gramos, precios por kg: se convierte (÷1000) para el dinero.
  const totalCost = round((initialQty / 1000) * purchasePrice, 2);
  if (sellingPrice === null) {
    return { totalCost, totalRevenue: null, netProfit: null };
  }
  const totalRevenue = round((netYield / 1000) * sellingPrice, 2);
  // Profit accounts for the purchase AND the registered expenses.
  return { totalCost, totalRevenue, netProfit: round(totalRevenue - totalCost - expensesTotal, 2) };
}
