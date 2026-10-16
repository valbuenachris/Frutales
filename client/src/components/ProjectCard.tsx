import { Link } from 'react-router-dom';
import { cn, formatMoney, formatQty } from '../lib/format';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import type { Project } from '../types/project';

/**
 * Dashboard list item: product name, net yield, color-coded profit and the
 * payment status badge. The whole card is a large tap target linking to the
 * details view. Projects without Fase 2 show a neutral "Sin venta" badge.
 */
export function ProjectCard({ project }: { project: Project }) {
  const profit = project.netProfit;
  const hasProfit = profit !== null;
  const profitable = hasProfit && profit >= 0;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100 transition hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{project.name}</h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {project.productName} · {project.processType}
          </p>
        </div>
        <PaymentStatusBadge status={project.paymentStatus} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Rendimiento neto</p>
          <p className="text-sm font-medium tabular-nums text-ink">{formatQty(project.netYield)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Ganancia neta</p>
          <p
            className={cn(
              'text-lg font-bold tabular-nums',
              hasProfit ? (profitable ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400',
            )}
          >
            {profit !== null ? formatMoney(profit) : '—'}
          </p>
        </div>
      </div>
    </Link>
  );
}
