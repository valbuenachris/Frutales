import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDialog } from './ConfirmDialog';
import { ImageViewer } from './ImageViewer';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { Input } from './ui/Input';
import { MoneyField } from './ui/MoneyField';
import { useCreatePayment, useDeletePayment, useUpdatePayment } from '../hooks/usePayments';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { parseNumber } from '../lib/calc';
import {
  cn,
  formatDate,
  formatMoney,
  formatMoneyUsd,
  toDateInputValue,
  todayInputValue,
} from '../lib/format';
import type { PaymentPayload } from '../api/projects';
import type { Payment, SaleCurrency } from '../types/project';

interface PaymentsSectionProps {
  projectId: string;
  payments: Payment[];
  /** Total abonado (COP). */
  paidAmount: number;
  /** Saldo pendiente (ingreso − abonado); null si no hay venta. */
  balance: number | null;
  /** Moneda de la venta; predetermina la del nuevo abono. */
  saleCurrency: SaleCurrency;
}

/**
 * Fase 2 · Abonos y pagos parciales de la venta: list + add/edit (modal) +
 * delete (with confirmation). Used on the details screen and inside the edit
 * form's "Fase 2" tab — the modals render through a portal so the section is
 * safe inside a <form>.
 */
export function PaymentsSection({
  projectId,
  payments,
  paidAmount,
  balance,
  saleCurrency,
}: PaymentsSectionProps) {
  const createMutation = useCreatePayment(projectId);
  const updateMutation = useUpdatePayment(projectId);
  const deleteMutation = useDeletePayment(projectId);

  const [modal, setModal] = useState<PaymentModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<Payment | null>(null);
  const [viewing, setViewing] = useState<Payment | null>(null);

  // Per-currency summary so mixed abonos (COP + USD) are explicit.
  const copPayments = payments.filter((payment) => payment.currency === 'COP');
  const usdPayments = payments.filter((payment) => payment.currency === 'USD');
  const copTotal = copPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const usdTotal = usdPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const usdTotalCop = usdPayments.reduce((sum, payment) => sum + payment.amountCop, 0);

  const openNew = () => {
    createMutation.reset();
    updateMutation.reset();
    setModal({ mode: 'new' });
  };

  const openEdit = (payment: Payment) => {
    createMutation.reset();
    updateMutation.reset();
    setModal({ mode: 'edit', payment });
  };

  const closeModal = () => setModal(null);

  const handleSubmit = (values: PaymentFormValues) => {
    const payload: PaymentPayload = {
      amount: parseNumber(values.amount),
      currency: values.currency,
      ...(values.currency === 'USD' ? { exchangeRate: parseNumber(values.exchangeRate) } : {}),
      ...(values.note.trim() ? { note: values.note.trim() } : {}),
      ...(values.image ? { image: values.image } : {}),
      ...(values.date ? { date: values.date } : {}),
    };
    if (modal?.mode === 'edit') {
      updateMutation.mutate({ paymentId: modal.payment.id, payload }, { onSuccess: closeModal });
    } else {
      createMutation.mutate(payload, { onSuccess: closeModal });
    }
  };

  const requestDelete = (payment: Payment) => {
    deleteMutation.reset();
    setPendingDelete(payment);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  };

  return (
    <>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Abonos y pagos
          </h2>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Total abonado (COP)
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {formatMoney(paidAmount)}
            </p>
          </div>
        </div>

        {usdPayments.length > 0 ? (
          <div className="mt-2 space-y-0.5 text-xs text-slate-500">
            {copPayments.length > 0 ? (
              <p>
                En pesos: {formatMoney(copTotal)} ({copPayments.length}{' '}
                {copPayments.length === 1 ? 'abono' : 'abonos'})
              </p>
            ) : null}
            <p>
              En dólares: {formatMoneyUsd(usdTotal)} ≈ {formatMoney(usdTotalCop)} (
              {usdPayments.length} {usdPayments.length === 1 ? 'abono' : 'abonos'})
            </p>
          </div>
        ) : null}

        {balance !== null ? (
          <p
            className={cn(
              'mt-2 text-sm font-medium',
              balance <= 0 ? 'text-emerald-600' : 'text-amber-700',
            )}
          >
            {balance <= 0
              ? 'Venta pagada por completo.'
              : `Saldo pendiente: ${formatMoney(balance)}`}
          </p>
        ) : null}

        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Sin abonos registrados. Agrega pagos parciales (abonos) para llevar el control del
            saldo.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {payment.note ?? 'Abono'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {payment.date ? formatDate(payment.date) : 'Sin fecha'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {payment.image ? (
                    <button
                      type="button"
                      onClick={() => setViewing(payment)}
                      aria-label="Ver comprobante del pago"
                    >
                      <img
                        src={payment.image}
                        alt="Comprobante del pago"
                        className="h-10 w-10 rounded-lg object-cover ring-1 ring-stone-200"
                      />
                    </button>
                  ) : null}
                  <span className="text-right text-sm font-semibold tabular-nums text-ink">
                    <span className="flex items-center justify-end gap-1.5">
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                          payment.currency === 'USD'
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-stone-100 text-slate-500',
                        )}
                      >
                        {payment.currency}
                      </span>
                      {payment.currency === 'USD'
                        ? formatMoneyUsd(payment.amount)
                        : formatMoney(payment.amount)}
                    </span>
                    {payment.currency === 'USD' ? (
                      <span className="block text-xs font-normal text-slate-500">
                        ≈ {formatMoney(payment.amountCop)}
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-10 px-2.5 text-xs"
                    onClick={() => openEdit(payment)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="min-h-10 px-2.5 text-xs"
                    onClick={() => requestDelete(payment)}
                    disabled={deleteMutation.isPending}
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {deleteMutation.error ? (
          <p className="mt-3 text-sm text-rose-600">{deleteMutation.error.message}</p>
        ) : null}

        <Button type="button" variant="secondary" fullWidth className="mt-4" onClick={openNew}>
          Agregar abono o pago
        </Button>
      </section>

      {/* Modals portal to <body> so this section works inside the edit form */}
      {modal
        ? createPortal(
            <PaymentModal
              key={modal.mode === 'edit' ? modal.payment.id : 'new'}
              title={modal.mode === 'edit' ? 'Editar abono' : 'Nuevo abono o pago'}
              initial={buildPaymentInitial(
                modal.mode === 'edit' ? modal.payment : undefined,
                saleCurrency,
              )}
              isSaving={createMutation.isPending || updateMutation.isPending}
              errorMessage={(createMutation.error ?? updateMutation.error)?.message ?? null}
              onSubmit={handleSubmit}
              onClose={closeModal}
            />,
            document.body,
          )
        : null}

      {pendingDelete
        ? createPortal(
            <ConfirmDialog
              title="Eliminar abono"
              message={`¿Estás seguro de eliminar el abono "${pendingDelete.note ?? formatMoney(pendingDelete.amount)}"? Esta acción no se puede deshacer.`}
              isBusy={deleteMutation.isPending}
              errorMessage={deleteMutation.error?.message ?? null}
              onConfirm={confirmDelete}
              onClose={() => setPendingDelete(null)}
            />,
            document.body,
          )
        : null}

      {/* In-app viewer: mobile browsers block opening data: URLs in a new tab */}
      {viewing?.image ? (
        <ImageViewer
          image={viewing.image}
          title={viewing.note ?? 'Abono'}
          downloadName={
            viewing.date
              ? `comprobante-pago-${toDateInputValue(new Date(viewing.date))}.jpg`
              : 'comprobante-pago.jpg'
          }
          onClose={() => setViewing(null)}
        />
      ) : null}
    </>
  );
}

// ------------------------------- Payment modal ------------------------------

type PaymentModalState = { mode: 'new' } | { mode: 'edit'; payment: Payment } | null;

/**
 * Initial values for the payment modal (pure so it can be unit-tested):
 * a NEW abono defaults to the sale currency (USD sales open ready for the
 * TRM, COP sales stay simple); editing keeps the payment's own currency.
 */
export function buildPaymentInitial(
  payment: Payment | undefined,
  saleCurrency: SaleCurrency,
): PaymentFormValues {
  if (!payment) {
    return {
      amount: '',
      currency: saleCurrency,
      exchangeRate: '',
      note: '',
      image: null,
      date: todayInputValue(),
    };
  }
  return {
    amount: String(payment.amount),
    currency: payment.currency,
    exchangeRate: payment.exchangeRate !== null ? String(payment.exchangeRate) : '',
    note: payment.note ?? '',
    image: payment.image,
    date: payment.date ? toDateInputValue(new Date(payment.date)) : '',
  };
}

interface PaymentFormValues {
  amount: string;
  currency: SaleCurrency;
  exchangeRate: string;
  note: string;
  image: string | null;
  date: string;
}

interface PaymentModalProps {
  title: string;
  initial: PaymentFormValues;
  isSaving: boolean;
  errorMessage: string | null;
  onSubmit: (values: PaymentFormValues) => void;
  onClose: () => void;
}

function PaymentModal({ title, initial, isSaving, errorMessage, onSubmit, onClose }: PaymentModalProps) {
  const [values, setValues] = useState<PaymentFormValues>(initial);
  const [formError, setFormError] = useState<string | null>(null);

  // TRM preview while the payment is in dólares.
  const rateQuery = useExchangeRate(values.currency === 'USD');

  useEffect(() => {
    if (values.currency === 'USD' && values.exchangeRate.trim() === '' && rateQuery.data) {
      setValues((prev) => ({ ...prev, exchangeRate: String(rateQuery.data.rate) }));
    }
  }, [values.currency, values.exchangeRate, rateQuery.data]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (parseNumber(values.amount) <= 0) {
      setFormError('El monto del pago debe ser mayor que 0.');
      return;
    }
    if (values.currency === 'USD' && parseNumber(values.exchangeRate) <= 0) {
      setFormError('El precio del dólar es obligatorio para pagos en dólares.');
      // Lleva al usuario directo al campo de la TRM.
      document.getElementById('paymentAmount-rate')?.focus();
      return;
    }
    setFormError(null);
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40"
      />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
        <h2 className="text-lg font-bold text-ink">{title}</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <MoneyField
            id="paymentAmount"
            label={values.currency === 'USD' ? 'Monto del pago (US$)' : 'Monto del pago (COP)'}
            amount={values.amount}
            onAmountChange={(value) => setValues((prev) => ({ ...prev, amount: value }))}
            currency={values.currency}
            onCurrencyChange={(currency) =>
              setValues((prev) =>
                currency === 'COP'
                  ? { ...prev, currency, exchangeRate: '' }
                  : { ...prev, currency },
              )
            }
            exchangeRate={values.exchangeRate}
            onExchangeRateChange={(value) => setValues((prev) => ({ ...prev, exchangeRate: value }))}
            image={values.image}
            onImageChange={(image) => setValues((prev) => ({ ...prev, image }))}
            placeholder="20000"
            rateInfo={rateQuery.data}
            rateLoading={rateQuery.isPending}
            rateError={rateQuery.isError}
          />

          <Field label="Nota (opcional)" htmlFor="paymentNote">
            <Input
              id="paymentNote"
              value={values.note}
              onChange={(e) => setValues((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Ej.: Abono quincenal"
              autoComplete="off"
            />
          </Field>

          <Field label="Fecha (opcional)" htmlFor="paymentDate">
            <Input
              id="paymentDate"
              type="date"
              value={values.date}
              onChange={(e) => setValues((prev) => ({ ...prev, date: e.target.value }))}
            />
          </Field>

          {formError || errorMessage ? (
            <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              {formError ?? errorMessage}
            </p>
          ) : null}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" fullWidth onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
