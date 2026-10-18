import { formatMoneyCompact } from '../../lib/format';
import type { MonthlyPoint } from '../../types/catalog';

const monthFormatter = new Intl.DateTimeFormat('es-CO', { month: 'short' });

/** "2026-10" -> "oct" (es-CO, sin punto final). */
const monthLabel = (month: string): string =>
  monthFormatter.format(new Date(`${month}-15T12:00:00.000Z`)).replace('.', '');

/**
 * Hand-rolled SVG chart (no chart library): grouped bars for revenue and
 * profit over the last 6 months. Responsive via viewBox, supports negative
 * profit months and exposes native <title> tooltips + accessible labels.
 */
export function MonthlyBars({ data }: { data: MonthlyPoint[] }) {
  const width = 340;
  const height = 190;
  const padTop = 20;
  const padBottom = 26;
  const padX = 8;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(...data.map((point) => point.revenue), ...data.map((point) => point.profit), 1);
  const minVal = Math.min(...data.map((point) => point.profit), 0);
  const span = maxVal - minVal || 1;
  const y = (value: number) => padTop + ((maxVal - value) / span) * plotH;
  const zeroY = y(0);

  const groupW = plotW / data.length;
  const barW = Math.min(14, groupW / 3.4);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Ingresos y ganancia por mes (últimos 6 meses)"
    >
      {/* Horizontal gridlines */}
      {[0, 0.5, 1].map((fraction) => {
        const gridY = padTop + plotH * fraction;
        return (
          <line
            key={fraction}
            x1={padX}
            x2={width - padX}
            y1={gridY}
            y2={gridY}
            className="stroke-stone-100"
            strokeWidth="1"
          />
        );
      })}

      {data.map((point, index) => {
        const centerX = padX + groupW * index + groupW / 2;
        const revenueX = centerX - barW - 2;
        const profitX = centerX + 2;
        const revenueTop = Math.min(y(point.revenue), zeroY);
        const revenueHeight = Math.max(Math.abs(zeroY - y(point.revenue)), 1);
        const profitTop = point.profit >= 0 ? y(point.profit) : zeroY;
        const profitHeight = Math.max(Math.abs(zeroY - y(point.profit)), 1);

        return (
          <g key={point.month}>
            <rect
              x={revenueX}
              y={revenueTop}
              width={barW}
              height={revenueHeight}
              rx={3}
              className="fill-teal-600"
            >
              <title>{`${monthLabel(point.month)}: Ingresos ${formatMoneyCompact(point.revenue)}`}</title>
            </rect>
            <rect
              x={profitX}
              y={profitTop}
              width={barW}
              height={profitHeight}
              rx={3}
              className={point.profit >= 0 ? 'fill-emerald-500' : 'fill-rose-500'}
            >
              <title>{`${monthLabel(point.month)}: Ganancia ${formatMoneyCompact(point.profit)}`}</title>
            </rect>

            {point.revenue > 0 ? (
              <text
                x={centerX}
                y={revenueTop - 4}
                textAnchor="middle"
                fontSize="8"
                className="fill-slate-500"
              >
                {formatMoneyCompact(point.revenue)}
              </text>
            ) : null}

            <text
              x={centerX}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              className="fill-slate-400"
            >
              {monthLabel(point.month)}
            </text>
          </g>
        );
      })}

      {/* Zero baseline */}
      <line
        x1={padX}
        x2={width - padX}
        y1={zeroY}
        y2={zeroY}
        className="stroke-stone-300"
        strokeWidth="1.5"
      />
    </svg>
  );
}
