import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/Feedback';
import { PageHeader } from '../components/Layout';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { Button } from '../components/ui/Button';
import { useDashboardMetrics } from '../hooks/useDashboard';
import { cn, formatDate, formatMoney } from '../lib/format';

/** Metrics dashboard: KPI cards, revenue-vs-cost bars and recent activity. */
export function DashboardPage() {
  const { data: metrics, isPending, isError, error, refetch } = useDashboardMetrics();

  if (isPending) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <LoadingState label="Cargando métricas…" />
      </>
    );
  }

  if (isError || !metrics) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState
          message={error?.message ?? 'No se pudieron cargar las métricas.'}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  const profitable = metrics.netProfit >= 0;
  const maxBar = Math.max(
    ...metrics.chartData.map((item) => Math.max(item.totalCost, item.totalRevenue)),
    1,
  );

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Resumen general de tus proyectos y ventas." />

      {/* KPI cards (stack on mobile, 2 columns from sm) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard label="Proyectos totales" value={String(metrics.totalProjects)} />
        <KpiCard
          label="Ingresos totales"
          value={formatMoney(metrics.totalRevenue)}
          accent="text-teal-700"
        />
        <KpiCard
          label="Ganancia neta"
          value={formatMoney(metrics.netProfit)}
          accent={profitable ? 'text-emerald-600' : 'text-rose-600'}
        />
        <KpiCard
          label="Créditos pendientes"
          value={String(metrics.outstandingCredits)}
          accent="text-amber-600"
          hint={`${metrics.pendingCredits} pendientes · ${metrics.overdueCredits} vencidos`}
        />
      </div>

      {/* Revenue vs cost per recent sold batch (pure Tailwind bars, no chart lib) */}
      {metrics.chartData.length > 0 ? (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Ingresos vs. costos (últimos lotes vendidos)
          </h2>
          <ul className="mt-4 space-y-4">
            {metrics.chartData.map((item) => (
              <li key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-ink">{item.name}</span>
                  <span
                    className={cn(
                      'shrink-0 text-xs font-semibold tabular-nums',
                      item.totalRevenue >= item.totalCost ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    {formatMoney(item.totalRevenue)}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <Bar label="Costo" value={item.totalCost} max={maxBar} barClassName="bg-slate-300" />
                  <Bar
                    label="Ingreso"
                    value={item.totalRevenue}
                    max={maxBar}
                    barClassName="bg-teal-600"
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Recent activity */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Actividad reciente
          </h2>
          <Link to="/projects" className="text-sm font-medium text-brand hover:underline">
            Ver proyectos
          </Link>
        </div>

        {metrics.recentProjects.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Aún no hay proyectos registrados.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {metrics.recentProjects.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/projects/${project.id}`}
                  className="-m-2 flex items-center justify-between gap-3 rounded-xl p-2 transition hover:bg-stone-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{project.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {project.productName} · {formatDate(project.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        project.netProfit === null
                          ? 'text-slate-400'
                          : project.netProfit >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600',
                      )}
                    >
                      {project.netProfit !== null ? formatMoney(project.netProfit) : '—'}
                    </span>
                    <PaymentStatusBadge status={project.paymentStatus} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6">
        <Link to="/projects/new" className="block">
          <Button fullWidth>Crear proyecto</Button>
        </Link>
      </div>
    </>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  accent?: string;
  hint?: string;
}

function KpiCard({ label, value, accent, hint }: KpiCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums text-ink', accent)}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
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
      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-500">
        {formatMoney(value)}
      </span>
    </div>
  );
}
