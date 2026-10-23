import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExpensesSection } from '../components/ExpensesSection';
import { ErrorState, LoadingState } from '../components/Feedback';
import { ImageViewer } from '../components/ImageViewer';
import { PageHeader } from '../components/Layout';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { PaymentsSection } from '../components/PaymentsSection';
import { SummaryCard } from '../components/SummaryCard';
import { Button } from '../components/ui/Button';
import { useDeleteProject, useProject } from '../hooks/useProjects';
import { formatDate, formatMoney, formatMoneyUsd, formatPct, formatQty } from '../lib/format';

/** Details screen: Fase 1 (compra, gastos y proceso) + Fase 2 (venta). */
export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isPending, isError, error, refetch } = useProject(id);
  const deleteMutation = useDeleteProject();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
    deleteMutation.reset();
    setConfirmingDelete(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(project.id, { onSuccess: () => navigate('/') });
  };

  return (
    <>
      <PageHeader title={project.name} backTo="/" />

      <div className="space-y-5">
        {/* ============ Fase 1: compra, gastos y procesamiento ============ */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Fase 1 · Compra y procesamiento
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-slate-600">
              {project.productName}
            </span>
            {project.netYieldOverridden ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                Rendimiento ajustado manualmente
              </span>
            ) : null}
          </div>

          <dl className="mt-5 space-y-3">
            <InfoRow label="Cantidad inicial" value={formatQty(project.initialQty)} />
            <InfoRow
              label="Precio de compra"
              value={
                project.purchaseCurrency === 'USD'
                  ? `${formatMoneyUsd(project.purchasePrice)} / kg · TRM ${formatMoney(project.purchaseExchangeRate ?? 0)}`
                  : `${formatMoney(project.purchasePrice)} / kg`
              }
            />
            <InfoRow label="Caída/Merma" value={formatPct(project.reductionPct)} />
            <InfoRow label="Rendimiento neto" value={formatQty(project.netYield)} />
          </dl>

          {project.purchaseImage ? (
            <div className="mt-5">
              <ReceiptThumb label="Comprobante de compra" image={project.purchaseImage} />
            </div>
          ) : null}
        </section>

        {/* Gastos de la Fase 1 (se suman al costo total del producto) */}
        <ExpensesSection
          projectId={project.id}
          expenses={project.expenses}
          expensesTotal={project.expensesTotal}
        />

        {/* ================== Fase 2: venta + abonos ================== */}
        {hasSale ? (
          <>
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Fase 2 · Venta
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
                label={project.currency === 'USD' ? 'Precio de venta (US$)' : 'Precio de venta'}
                value={
                  project.currency === 'USD'
                    ? `${formatMoneyUsd(project.sellingPrice ?? 0)} / kg`
                    : `${formatMoney(project.sellingPrice ?? 0)} / kg`
                }
              />
              <InfoRow
                label="Moneda"
                value={project.currency === 'USD' ? 'Dólares (USD)' : 'Pesos (COP)'}
              />
              {project.currency === 'USD' ? (
                <InfoRow
                  label="Precio del dólar (TRM)"
                  value={`${formatMoney(project.exchangeRate ?? 0)} / US$`}
                />
              ) : null}
              <InfoRow label="Tipo de pago" value={project.paymentType ?? '—'} />
              {project.scheduledPaymentDate ? (
                <InfoRow
                  label="Fecha programada de pago"
                  value={formatDate(project.scheduledPaymentDate)}
                />
              ) : null}
            </dl>

            {project.saleImage ? (
              <div className="mt-5">
                <ReceiptThumb label="Comprobante de venta" image={project.saleImage} />
              </div>
            ) : null}
            </section>

            {/* Abonos y pagos parciales de la venta */}
            <PaymentsSection
              projectId={project.id}
              payments={project.payments}
              paidAmount={project.paidAmount}
              balance={project.balance}
              saleCurrency={project.currency ?? 'COP'}
            />
          </>
        ) : (
          <section className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Fase 2 · Venta pendiente
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
            // "Total inversión" = solo la compra ((cantidad inicial ÷ 1000) × precio de compra).
            // "Venta total en pesos" = lo recibido de la venta (normalizado a COP).
            totalCost: project.purchaseCost,
            totalRevenue: project.totalRevenue,
            netProfit: project.netProfit,
          }}
          rows={[
            ...(project.expensesTotal > 0
              ? [{ label: 'Gastos', value: formatMoney(project.expensesTotal) }]
              : []),
            {
              label: 'Costo por gramo',
              // (Costo de compra + gastos) ÷ gramo de producto terminado.
              value:
                project.netYield > 0 && project.purchaseCost + project.expensesTotal > 0
                  ? `${formatMoney((project.purchaseCost + project.expensesTotal) / project.netYield)} / g`
                  : '—',
            },
            ...(project.netProfit !== null && project.netYield > 0
              ? [
                  {
                    label: 'Ganancia neta por gramo',
                    value: `${formatMoney(project.netProfit / project.netYield)} / g`,
                  },
                ]
              : []),
            ...(marginPct !== null
              ? [{ label: 'Margen de ganancia', value: formatPct(marginPct) }]
              : []),
          ]}
        />

        {/* Formula reminder */}
        <p className="px-1 text-xs leading-relaxed text-slate-400">
          Total inversión = (cantidad inicial ÷ 1000) × precio de compra · Costo por gramo = (total
          inversión + gastos) ÷ rendimiento neto · Ganancia neta por gramo = ganancia neta ÷
          rendimiento neto
          {project.totalRevenue !== null
            ? project.currency === 'USD'
              ? ' · Ingreso = (rendimiento neto ÷ 1000) × precio en US$ × TRM (COP/USD) · Ganancia = ingreso − costo − gastos.'
              : ' · Ingreso = (rendimiento neto ÷ 1000) × precio de venta · Ganancia = ingreso − costo − gastos.'
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
        </div>
      </div>

      {/* Delete confirmation (removes the project with all of its data) */}
      {confirmingDelete ? (
        <ConfirmDialog
          title="Eliminar proyecto"
          message={`¿Estás seguro de eliminar "${project.name}" con todos sus datos (venta, gastos y comprobantes)? Esta acción no se puede deshacer.`}
          isBusy={deleteMutation.isPending}
          errorMessage={deleteMutation.error?.message ?? null}
          onConfirm={confirmDelete}
          onClose={() => setConfirmingDelete(false)}
        />
      ) : null}
    </>
  );
}

/** Small tappable thumbnail of a receipt (comprobante) that opens in-app. */
function ReceiptThumb({ label, image }: { label: string; image: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-xl bg-stone-50 p-2 text-left ring-1 ring-stone-100"
      >
        <img src={image} alt={label} className="h-12 w-12 rounded-lg object-cover" />
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </button>
      {open ? (
        <ImageViewer
          image={image}
          title={label}
          downloadName={`${label.toLowerCase().replaceAll(' ', '-')}.jpg`}
          onClose={() => setOpen(false)}
        />
      ) : null}
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
