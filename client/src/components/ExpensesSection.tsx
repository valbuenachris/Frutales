import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDialog } from './ConfirmDialog';
import { ImageViewer } from './ImageViewer';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { Input } from './ui/Input';
import { MoneyField } from './ui/MoneyField';
import { useCreateExpense, useDeleteExpense, useUpdateExpense } from '../hooks/useExpenses';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { parseNumber } from '../lib/calc';
import {
  formatDate,
  formatInputNumber,
  formatMoney,
  formatMoneyUsd,
  toDateInputValue,
  todayInputValue,
} from '../lib/format';
import type { ExpensePayload } from '../api/projects';
import type { Expense, SaleCurrency } from '../types/project';

interface ExpensesSectionProps {
  projectId: string;
  expenses: Expense[];
  expensesTotal: number;
}

/**
 * Fase 1 · Gastos: list + add/edit (modal) + delete (with confirmation).
 * Used on the details screen and inside the edit form's "Fase 1" tab — the
 * modals render through a portal so the section is safe inside a <form>.
 */
export function ExpensesSection({ projectId, expenses, expensesTotal }: ExpensesSectionProps) {
  const createMutation = useCreateExpense(projectId);
  const updateMutation = useUpdateExpense(projectId);
  const deleteMutation = useDeleteExpense(projectId);

  const [modal, setModal] = useState<ExpenseModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [viewing, setViewing] = useState<Expense | null>(null);

  const openNew = () => {
    createMutation.reset();
    updateMutation.reset();
    setModal({ mode: 'new' });
  };

  const openEdit = (expense: Expense) => {
    createMutation.reset();
    updateMutation.reset();
    setModal({ mode: 'edit', expense });
  };

  const closeModal = () => setModal(null);

  const handleSubmit = (values: ExpenseFormValues) => {
    const payload: ExpensePayload = {
      concept: values.concept.trim(),
      amount: parseNumber(values.amount),
      currency: values.currency,
      ...(values.currency === 'USD' ? { exchangeRate: parseNumber(values.exchangeRate) } : {}),
      ...(values.image ? { image: values.image } : {}),
      ...(values.date ? { date: values.date } : {}),
    };
    if (modal?.mode === 'edit') {
      updateMutation.mutate({ expenseId: modal.expense.id, payload }, { onSuccess: closeModal });
    } else {
      createMutation.mutate(payload, { onSuccess: closeModal });
    }
  };

  const requestDelete = (expense: Expense) => {
    deleteMutation.reset();
    setPendingDelete(expense);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  };

  return (
    <>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gastos</h2>
          <span className="text-sm font-semibold tabular-nums text-ink">
            {formatMoney(expensesTotal)}
          </span>
        </div>

        {expenses.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Sin gastos registrados. Agrega empaque, transporte u otros costos y se sumarán al
            costo del producto.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{expense.concept}</p>
                  <p className="text-xs text-slate-500">
                    {expense.date ? formatDate(expense.date) : 'Sin fecha'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {expense.image ? (
                    <button
                      type="button"
                      onClick={() => setViewing(expense)}
                      aria-label="Ver comprobante del gasto"
                    >
                      <img
                        src={expense.image}
                        alt="Comprobante del gasto"
                        className="h-10 w-10 rounded-lg object-cover ring-1 ring-stone-200"
                      />
                    </button>
                  ) : null}
                  <span className="text-right text-sm font-semibold tabular-nums text-ink">
                    {expense.currency === 'USD'
                      ? formatMoneyUsd(expense.amount)
                      : formatMoney(expense.amount)}
                    {expense.currency === 'USD' ? (
                      <span className="block text-xs font-normal text-slate-500">
                        ≈ {formatMoney(expense.amountCop)}
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-10 px-2.5 text-xs"
                    onClick={() => openEdit(expense)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="min-h-10 px-2.5 text-xs"
                    onClick={() => requestDelete(expense)}
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
          Agregar gasto
        </Button>
      </section>

      {/* Modals portal to <body> so this section works inside the edit form */}
      {modal
        ? createPortal(
            <ExpenseModal
              key={modal.mode === 'edit' ? modal.expense.id : 'new'}
              title={modal.mode === 'edit' ? 'Editar gasto' : 'Nuevo gasto'}
              initial={
                modal.mode === 'edit'
                  ? {
                      concept: modal.expense.concept,
                      amount: formatInputNumber(modal.expense.amount, 0),
                      currency: modal.expense.currency,
                      exchangeRate:
                        modal.expense.exchangeRate !== null
                          ? formatInputNumber(modal.expense.exchangeRate, 0)
                          : '',
                      image: modal.expense.image,
                      date: modal.expense.date
                        ? toDateInputValue(new Date(modal.expense.date))
                        : '',
                    }
                  : {
                      concept: '',
                      amount: '',
                      currency: 'COP',
                      exchangeRate: '',
                      image: null,
                      date: todayInputValue(),
                    }
              }
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
              title="Eliminar gasto"
              message={`¿Estás seguro de eliminar el gasto "${pendingDelete.concept}"? Esta acción no se puede deshacer.`}
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
          title={viewing.concept}
          downloadName={
            viewing.date
              ? `comprobante-gasto-${toDateInputValue(new Date(viewing.date))}.jpg`
              : 'comprobante-gasto.jpg'
          }
          onClose={() => setViewing(null)}
        />
      ) : null}
    </>
  );
}

// ------------------------------- Expense modal ------------------------------

type ExpenseModalState = { mode: 'new' } | { mode: 'edit'; expense: Expense } | null;

interface ExpenseFormValues {
  concept: string;
  amount: string;
  currency: SaleCurrency;
  exchangeRate: string;
  image: string | null;
  date: string;
}

interface ExpenseModalProps {
  title: string;
  initial: ExpenseFormValues;
  isSaving: boolean;
  errorMessage: string | null;
  onSubmit: (values: ExpenseFormValues) => void;
  onClose: () => void;
}

function ExpenseModal({ title, initial, isSaving, errorMessage, onSubmit, onClose }: ExpenseModalProps) {
  const [values, setValues] = useState<ExpenseFormValues>(initial);
  const [formError, setFormError] = useState<string | null>(null);

  // TRM preview while the expense is in dólares.
  const rateQuery = useExchangeRate(values.currency === 'USD');

  useEffect(() => {
    if (values.currency === 'USD' && values.exchangeRate.trim() === '' && rateQuery.data) {
      setValues((prev) => ({ ...prev, exchangeRate: String(Math.round(rateQuery.data.rate)) }));
    }
  }, [values.currency, values.exchangeRate, rateQuery.data]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.concept.trim()) {
      setFormError('El concepto del gasto es obligatorio.');
      return;
    }
    if (!Number.isInteger(parseNumber(values.amount))) {
      setFormError('El monto del gasto no puede tener decimales.');
      return;
    }
    if (parseNumber(values.amount) <= 0) {
      setFormError('El monto del gasto debe ser mayor que 0.');
      return;
    }
    if (values.currency === 'USD') {
      if (!Number.isInteger(parseNumber(values.exchangeRate))) {
        setFormError('El precio del dólar no puede tener decimales.');
        return;
      }
      if (parseNumber(values.exchangeRate) <= 0) {
        setFormError('El precio del dólar es obligatorio para gastos en dólares.');
        return;
      }
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
          <Field label="Concepto" htmlFor="expenseConcept">
            <Input
              id="expenseConcept"
              value={values.concept}
              onChange={(e) => setValues((prev) => ({ ...prev, concept: e.target.value }))}
              placeholder="Ej.: Empaque"
              autoComplete="off"
            />
          </Field>

          <MoneyField
            id="expenseAmount"
            label="Monto"
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
            placeholder="1500"
            rateInfo={rateQuery.data}
            rateLoading={rateQuery.isPending}
            rateError={rateQuery.isError}
          />

          <Field label="Fecha (opcional)" htmlFor="expenseDate">
            <Input
              id="expenseDate"
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
