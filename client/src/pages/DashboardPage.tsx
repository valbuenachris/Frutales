import { Link } from 'react-router-dom';
import { CollectionsDonut } from '../components/charts/CollectionsDonut';
import { MonthlyBars } from '../components/charts/MonthlyBars';
import { ProjectBars } from '../components/charts/ProjectBars';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { PageHeader } from '../components/Layout';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { Button } from '../components/ui/Button';
import { useDashboardMetrics } from '../hooks/useDashboard';
import { cn, formatDate, formatMoney, formatPct } from '../lib/format';

const SECTION_TITLE = 'text-sm font-semibold uppercase tracking-wide text-slate-500';

/** Metrics dashboard: KPIs, monthly trend, collections, rankings and recents. */
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
  const hasProjects = metrics.totalProjects > 0;
  const hasMonthlyData = metrics.monthly.some((point) => point.revenue !== 0 || point.cost !== 0);
  const hasCollections = metrics.totalPaid > 0 || metrics.outstandingAmount > 0;
  const maxProductProfit = Math.max(...metrics.topProducts.map((product) => product.profit), 1);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Resumen general de tus proyectos, ventas y cobros." />

      {/* KPI cards (stack on mobile, 2 columns from sm) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard
          label="Ventas totales"
          value={formatMoney(metrics.totalRevenue)}
          accent="text-teal-700"
          hint={`Cobrado ${formatMoney(metrics.totalPaid)}`}
        />
        <KpiCard
          label="Ganancia neta"
          value={formatMoney(metrics.netProfit)}
          accent={profitable ? 'text-emerald-600' : 'text-rose-600'}
          hint={
            metrics.profitMargin !== null
              ? `Margen ${formatPct(metrics.profitMargin)}`
              : 'Sin ventas aún'
          }
        />
        <KpiCard
          label="Por cobrar"
          value={formatMoney(metrics.outstandingAmount)}
          accent="text-amber-600"
          hint={
            metrics.overdueAmount > 0
              ? `Vencido ${formatMoney(metrics.overdueAmount)} · ${metrics.overdueCredits} ${metrics.overdueCredits === 1 ? 'lote' : 'lotes'}`
              : 'Sin saldos vencidos'
          }
        />
        <KpiCard
          label="Inversión en gastos"
          value={formatMoney(metrics.totalExpenses)}
          hint="De lotes vendidos"
        />
        <KpiCard
          label="Proyectos"
          value={String(metrics.totalProjects)}
          hint={`${metrics.soldProjects} vendidos · ${metrics.unsoldProjects} sin vender`}
        />
      </div>

      {!hasProjects ? (
        <div className="mt-6">
          <EmptyState
            title="Aún no hay proyectos"
            description="Crea tu primer lote para empezar a ver tus métricas."
            action={
              <Link to="/projects/new">
                <Button>Crear proyecto</Button>
              </Link>
            }
          />
        </div>
      ) : null}

      {/* Monthly trend (last 6 months) */}
      {hasMonthlyData ? (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <h2 className={SECTION_TITLE}>Evolución mensual (últimos 6 meses)</h2>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Ganancia
            </span>
          </div>
          <div className="mt-3">
            <MonthlyBars data={metrics.monthly} />
          </div>
        </section>
      ) : null}

      {/* Collections: paid vs outstanding + status counts */}
      {hasCollections ? (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <h2 className={SECTION_TITLE}>Cobros</h2>
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
            <CollectionsDonut paid={metrics.totalPaid} outstanding={metrics.outstandingAmount} />
            <div className="w-full min-w-0 space-y-2">
              <LegendRow
                dotClassName="bg-emerald-500"
                label="Cobrado"
                value={formatMoney(metrics.totalPaid)}
              />
              <LegendRow
                dotClassName="bg-amber-200"
                label="Por cobrar"
                value={formatMoney(metrics.outstandingAmount)}
              />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                {metrics.paymentBreakdown
                  .filter((entry) => entry.count > 0)
                  .map((entry) => (
                    <span key={entry.status} className="flex items-center gap-1.5">
                      <PaymentStatusBadge status={entry.status} />
                      <span className="text-sm font-medium tabular-nums text-slate-600">
                        {entry.count}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Top products by profit */}
      {metrics.topProducts.length > 0 ? (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <h2 className={SECTION_TITLE}>Top productos (por ganancia)</h2>
          <ul className="mt-4 space-y-4">
            {metrics.topProducts.map((product) => (
              <li key={product.name}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-ink">{product.name}</span>
                  <span
                    className={cn(
                      'shrink-0 text-xs font-semibold tabular-nums',
                      product.profit >= 0 ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    {formatMoney(product.profit)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-emerald-500/80"
                      style={{ width: `${Math.max((product.profit / maxProductProfit) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="w-40 shrink-0 text-right text-xs text-slate-400">
                    {product.projectCount} {product.projectCount === 1 ? 'lote' : 'lotes'} ·{' '}
                    {formatMoney(product.revenue)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Top debtors by outstanding balance */}
      {metrics.topDebtors.length > 0 ? (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <h2 className={SECTION_TITLE}>Top deudores (por saldo)</h2>
          <ul className="mt-4 space-y-3">
            {metrics.topDebtors.map((debtor) => (
              <li key={debtor.name} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{debtor.name}</p>
                  <p className="text-xs text-slate-500">
                    {debtor.projectCount} {debtor.projectCount === 1 ? 'lote' : 'lotes'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {debtor.overdue ? <PaymentStatusBadge status="Vencido" /> : null}
                  <span className="text-sm font-semibold tabular-nums text-amber-700">
                    {formatMoney(debtor.balance)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Top projects by profit */}
      {metrics.topProjects.length > 0 ? (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <h2 className={SECTION_TITLE}>Rendimiento por proyecto (top 5 por ganancia)</h2>
          <div className="mt-4">
            <ProjectBars data={metrics.topProjects} />
          </div>
        </section>
      ) : null}

      {/* Recent activity */}
      {hasProjects ? (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className={SECTION_TITLE}>Actividad reciente</h2>
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
      ) : null}

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

interface LegendRowProps {
  dotClassName: string;
  label: string;
  value: string;
}

function LegendRow({ dotClassName, label, value }: LegendRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-slate-600">
        <span className={cn('h-3 w-3 rounded-full', dotClassName)} />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}
