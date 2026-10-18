import { Link } from 'react-router-dom';
import { cn, formatMoney } from '../../lib/format';
import type { DashboardMetrics } from '../../types/catalog';

type ProjectBarItem = DashboardMetrics['topProjects'][number];

/** Horizontal mini-bars comparing cost vs revenue for the top projects. */
export function ProjectBars({ data }: { data: ProjectBarItem[] }) {
  const max = Math.max(...data.map((item) => Math.max(item.totalCost, item.totalRevenue)), 1);

  return (
    <ul className="space-y-4">
      {data.map((item) => (
        <li key={item.id}>
          <div className="flex items-center justify-between gap-3">
            <Link
              to={`/projects/${item.id}`}
              className="truncate text-sm font-medium text-ink hover:underline"
            >
              {item.name}
            </Link>
            <span
              className={cn(
                'w-28 shrink-0 whitespace-nowrap text-right text-xs font-semibold tabular-nums',
                item.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {formatMoney(item.netProfit)}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <Bar label="Costo" value={item.totalCost} max={max} barClassName="bg-slate-300" />
            <Bar label="Ingreso" value={item.totalRevenue} max={max} barClassName="bg-teal-600" />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface BarProps {
  label: string;
  value: number;
  max: number;
  barClassName: string;
}

function Bar({ label, value, max, barClassName }: BarProps) {
  const width = Math.max((value / max) * 100, 2);
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-slate-400">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
        <div className={cn('h-full rounded-full', barClassName)} style={{ width: `${width}%` }} />
      </div>
      <span className="w-28 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-slate-500">
        {formatMoney(value)}
      </span>
    </div>
  );
}
