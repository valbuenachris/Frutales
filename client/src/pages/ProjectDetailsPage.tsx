import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/Feedback';
import { PageHeader } from '../components/Layout';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { SummaryCard } from '../components/SummaryCard';
import { Button } from '../components/ui/Button';
import { useDeleteProject, useProject } from '../hooks/useProjects';
import { formatDate, formatMoney, formatPct, formatQty } from '../lib/format';

/** Details screen: full breakdown of one project (Fase 1 + Fase 2). */
export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isPending, isError, error, refetch } = useProject(id);
  const deleteMutation = useDeleteProject();

  if (isPending) {
    return (
      <>
        <LoadingState label="Cargando proyecto…" />
      </>
    );
  }

  if (isError || !project) {
    return (
      <>
        <PageHeader title="Proyecto" backTo="/" />
        <ErrorState
          message={error?.message ?? 'Proyecto no encontrado.'}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  const payment = project.netProfit;
  const marginPct =
    project.totalRevenue !== null && project.totalRevenue > 0 && payment !== null
      ? Math.round((payment / project.totalRevenue) * 1000) / 10
      : null;

  // Fase 2 is considered registered once the payment data exists (buyer +
  // payment type); legacy rows with only a price still prompt completion.
  const hasSale = project.sellingPrice !== null && project.paymentType !== null;

  const handleDelete = () => {
    if (!window.confirm(`¿Eliminar "${project.name}"? Esta acción no se puede deshacer.`)) return;
    deleteMutation.mutate(project.id, { onSuccess: () => navigate('/') });
  };

  return (
    <>
      <PageHeader title={project.name} backTo="/" />

      <div className="space-y-5">
        {/* Fase 1: inputs breakdown */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-slate-600">
              {project.productName}
            </span>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
              {project.processType}
            </span>
            {project.netYieldOverridden ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                Rendimiento ajustado manualmente
              </span>
            ) : null}
          </div>

          <dl className="mt-5 space-y-3">
            <InfoRow label="Cantidad inicial" value={formatQty(project.initialQty)} />
            <InfoRow label="Precio de compra" value={`${formatMoney(project.purchasePrice)} / kg`} />
            <InfoRow label="Reducción" value={formatPct(project.reductionPct)} />
            <InfoRow label="Rendimiento neto" value={formatQty(project.netYield)} />
          </dl>
        </section>

        {/* Fase 2: sale information (or the CTA to complete it) */}
        {hasSale ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Venta
              </h2>
              <PaymentStatusBadge status={project.paymentStatus} />
            </div>

            <dl className="mt-4 space-y-3">
              <InfoRow label="Comprador" value={project.buyerName ?? '—'} />
              <InfoRow label="Contacto" value={project.buyerContact ?? '—'} />
              <InfoRow
                label="Fecha de la transacción"
                value={project.transactionDate ? formatDate(project.transactionDate) : '—'}
              />
              <InfoRow
                label="Precio de venta"
                value={`${formatMoney(project.sellingPrice ?? 0)} / kg`}
              />
              <InfoRow label="Tipo de pago" value={project.paymentType ?? '—'} />
              {project.scheduledPaymentDate ? (
                <InfoRow
                  label="Fecha programada de pago"
                  value={formatDate(project.scheduledPaymentDate)}
                />
              ) : null}
            </dl>
          </section>
        ) : (
          <section className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Fase 2: venta pendiente
            </h2>
            <p className="mt-2 text-sm text-amber-800">
              Registra el comprador, el precio de venta y la forma de pago para calcular el
              ingreso y la ganancia de este lote.
            </p>
            <Link to={`/projects/${project.id}/edit?fase=2`} className="mt-4 block">
              <Button fullWidth>Completar venta</Button>
            </Link>
          </section>
        )}

        {/* Financial summary */}
        <SummaryCard
          totals={{
            totalCost: project.totalCost,
            totalRevenue: project.totalRevenue,
            netProfit: project.netProfit,
          }}
          rows={[
            {
              label: 'Costo por kg vendido',
              value:
                project.netYield > 0
                  ? `${formatMoney(project.totalCost / project.netYield)} / kg`
                  : '—',
            },
            ...(marginPct !== null
              ? [{ label: 'Margen de ganancia', value: formatPct(marginPct) }]
              : []),
          ]}
        />

        {/* Formula reminder */}
        <p className="px-1 text-xs leading-relaxed text-slate-400">
          Costo = cantidad inicial × precio de compra · Rendimiento = cantidad inicial × (1 −
          reducción%)
          {project.totalRevenue !== null
            ? ' · Ingreso = rendimiento neto × precio de venta · Ganancia = ingreso − costo.'
            : '. El ingreso y la ganancia se calculan al registrar la venta (Fase 2).'}
        </p>

        {/* Audit dates */}
        <p className="px-1 text-xs text-slate-400">
          Creado el {formatDate(project.createdAt)} · Actualizado el {formatDate(project.updatedAt)}
        </p>

        {/* Actions */}
        <div className="space-y-3 pt-1">
          <Link to={`/projects/${project.id}/edit`} className="block">
            <Button fullWidth>Editar proyecto</Button>
          </Link>
          <Button
            variant="danger"
            fullWidth
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar proyecto'}
          </Button>
          {deleteMutation.error ? (
            <p className="text-center text-sm text-rose-600">{deleteMutation.error.message}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}
