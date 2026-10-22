import { Link } from 'react-router-dom';
import { cn, formatMoney, formatQty } from '../lib/format';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import type { Project } from '../types/project';

interface ProjectCardProps {
  project: Project;
  /**
   * When provided, renders a delete action. The parent is responsible for
   * asking for confirmation and running the mutation.
   */
  onDelete?: (project: Project) => void;
}

/**
 * Dashboard list item: product name, net yield, color-coded profit and the
 * payment status badge. The content area links to the details view; the
 * optional delete action lives OUTSIDE the link (no nested interactive
 * elements).
 */
export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const profit = project.netProfit;
  const hasProfit = profit !== null;
  const profitable = hasProfit && profit >= 0;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100 transition hover:shadow-md">
      <Link to={`/projects/${project.id}`} className="block active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-ink">{project.name}</h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">{project.productName}</p>
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

      {onDelete ? (
        <div className="mt-3 flex justify-end border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={() => onDelete(project)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}
