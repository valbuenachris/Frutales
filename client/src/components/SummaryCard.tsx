import { cn, formatMoney } from '../lib/format';
import type { Totals } from '../lib/calc';

interface SummaryRow {
  label: string;
  value: string;
}

interface SummaryCardProps {
  totals: Totals;
  /** Extra rows rendered between revenue and profit (e.g. net yield). */
  rows?: SummaryRow[];
}

/**
 * Distinct financial summary card shown at the bottom of forms
 * and on the details screen.
 * - Net profit is color-coded: green for profit, red for loss.
 * - Revenue and profit show "—" while Fase 2 (venta) is not registered.
 */
export function SummaryCard({ totals, rows = [] }: SummaryCardProps) {
  const profit = totals.netProfit;
  const hasProfit = profit !== null;
  const profitable = hasProfit && profit >= 0;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Resumen</h2>

      <dl className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Total inversión</dt>
          <dd className="font-medium tabular-nums text-ink">{formatMoney(totals.totalCost)}</dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Venta total</dt>
          <dd className="font-medium tabular-nums text-ink">
            {totals.totalRevenue !== null ? (
              formatMoney(totals.totalRevenue)
            ) : (
              <span className="font-normal text-slate-400">Sin venta</span>
            )}
          </dd>
        </div>

        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className="text-slate-600">{row.label}</dt>
            <dd className="font-medium tabular-nums text-ink">{row.value}</dd>
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
          <dt className="text-base font-semibold text-ink">Ganancia neta</dt>
          <dd
            className={cn(
              'text-2xl font-bold tabular-nums',
              hasProfit ? (profitable ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400',
            )}
          >
            {profit !== null ? formatMoney(profit) : '—'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
