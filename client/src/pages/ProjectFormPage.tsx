import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/Feedback';
import { PageHeader } from '../components/Layout';
import { SummaryCard } from '../components/SummaryCard';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCreateProject, useProject, useUpdateProject } from '../hooks/useProjects';
import { computeNetYield, computeTotals, parseNumber } from '../lib/calc';
import { PROCESS_TYPES, type ProcessTypeOption } from '../lib/constants';
import { cn, formatQty, toDateInputValue, todayInputValue } from '../lib/format';
import type { PaymentType, Project, ProjectPayload } from '../types/project';

type FormPhase = 1 | 2;

interface ProjectFormValues {
  // Fase 1: compra y procesamiento
  name: string;
  productName: string;
  processType: ProcessTypeOption;
  customProcessType: string;
  initialQty: string;
  purchasePrice: string;
  reductionPct: string;
  netYieldOverridden: boolean;
  netYield: string;
  // Fase 2: venta
  buyerName: string;
  buyerContact: string;
  transactionDate: string; // YYYY-MM-DD
  sellingPrice: string;
  paymentType: PaymentType;
  scheduledPaymentDate: string; // YYYY-MM-DD, only for "Crédito"
}

const EMPTY_VALUES: ProjectFormValues = {
  name: '',
  productName: '',
  processType: 'Deshidratada',
  customProcessType: '',
  initialQty: '',
  purchasePrice: '',
  reductionPct: '0',
  netYieldOverridden: false,
  netYield: '',
  buyerName: '',
  buyerContact: '',
  transactionDate: todayInputValue(),
  sellingPrice: '',
  paymentType: 'Contado',
  scheduledPaymentDate: '',
};

/** Prefill the form when editing; reset when creating. */
function toFormValues(project?: Project): ProjectFormValues {
  if (!project) return EMPTY_VALUES;

  const isKnownProcess = (PROCESS_TYPES as readonly string[]).includes(project.processType);
  return {
    name: project.name,
    productName: project.productName,
    processType: isKnownProcess ? (project.processType as ProcessTypeOption) : 'Otro',
    customProcessType: isKnownProcess ? '' : project.processType,
    initialQty: String(project.initialQty),
    purchasePrice: String(project.purchasePrice),
    reductionPct: String(project.reductionPct),
    netYieldOverridden: project.netYieldOverridden,
    netYield: project.netYieldOverridden ? String(project.netYield) : '',
    buyerName: project.buyerName ?? '',
    buyerContact: project.buyerContact ?? '',
    transactionDate: project.transactionDate
      ? toDateInputValue(new Date(project.transactionDate))
      : todayInputValue(),
    sellingPrice: project.sellingPrice !== null ? String(project.sellingPrice) : '',
    paymentType: project.paymentType === 'Crédito' ? 'Crédito' : 'Contado',
    scheduledPaymentDate: project.scheduledPaymentDate
      ? toDateInputValue(new Date(project.scheduledPaymentDate))
      : '',
  };
}

const resolveProcessType = (values: ProjectFormValues): string =>
  values.processType === 'Otro' ? values.customProcessType.trim() : values.processType;

/**
 * A sale is being registered when any sale-specific field has content.
 * `transactionDate` (defaults to today) and `paymentType` (defaults to
 * "Contado") are excluded so an untouched Fase 2 tab stays inactive.
 */
const isSaleActive = (values: ProjectFormValues): boolean =>
  values.buyerName.trim() !== '' ||
  values.buyerContact.trim() !== '' ||
  values.sellingPrice.trim() !== '' ||
  values.scheduledPaymentDate !== '';

/** Cheap client-side validation; the server re-validates everything. */
function validate(values: ProjectFormValues): string | null {
  // Fase 1
  if (!values.name.trim()) return 'El nombre del proyecto es obligatorio.';
  if (!values.productName.trim()) return 'El nombre del producto es obligatorio.';
  if (!resolveProcessType(values)) return 'El tipo de proceso es obligatorio.';
  if (parseNumber(values.initialQty) <= 0) return 'La cantidad inicial debe ser mayor que 0.';
  if (parseNumber(values.purchasePrice) < 0) return 'El precio de compra no puede ser negativo.';
  const reduction = parseNumber(values.reductionPct);
  if (reduction < 0 || reduction > 100) return 'La reducción debe estar entre 0 y 100.';
  if (values.netYieldOverridden && parseNumber(values.netYield) < 0)
    return 'El rendimiento neto no puede ser negativo.';

  // Fase 2 (only validated when the sale is being registered)
  if (isSaleActive(values)) {
    if (!values.buyerName.trim()) return 'El nombre del comprador es obligatorio.';
    if (parseNumber(values.sellingPrice) < 0) return 'El precio de venta no puede ser negativo.';
    if (values.sellingPrice.trim() === '') return 'El precio de venta es obligatorio.';
    if (values.transactionDate === '') return 'La fecha de la transacción es obligatoria.';
    if (values.paymentType === 'Crédito') {
      if (values.scheduledPaymentDate === '')
        return 'La fecha programada de pago es obligatoria para pagos a crédito.';
      // ISO dates compare correctly as strings.
      if (values.scheduledPaymentDate <= todayInputValue())
        return 'La fecha programada de pago debe ser posterior a hoy.';
    } else if (values.scheduledPaymentDate !== '') {
      return 'No puedes indicar una fecha programada de pago con pago de contado.';
    }
  }

  return null;
}

/** Create/edit screen: fetches the project (edit mode) then renders the form. */
export function ProjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const { data: project, isPending, isError, error, refetch } = useProject(id);

  if (isEdit && isPending) {
    return (
      <>
        <LoadingState label="Cargando proyecto…" />
      </>
    );
  }

  if (isEdit && (isError || !project)) {
    return (
      <>
        <PageHeader title="Editar proyecto" backTo="/" />
        <ErrorState
          message={error?.message ?? 'Proyecto no encontrado.'}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  // `?fase=2` lets the details screen deep-link into the sale form.
  const initialPhase: FormPhase = searchParams.get('fase') === '2' ? 2 : 1;

  // `key` remounts the form with fresh initial state when data arrives.
  return (
    <ProjectForm
      key={project?.id ?? 'new'}
      project={project}
      initialPhase={project ? initialPhase : 1}
    />
  );
}

interface ProjectFormProps {
  project?: Project;
  initialPhase: FormPhase;
}

function ProjectForm({ project, initialPhase }: ProjectFormProps) {
  const navigate = useNavigate();
  const [values, setValues] = useState<ProjectFormValues>(() => toFormValues(project));
  const [phase, setPhase] = useState<FormPhase>(initialPhase);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject(project?.id ?? '');
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const patch = (partial: Partial<ProjectFormValues>) =>
    setValues((prev) => ({ ...prev, ...partial }));

  const changePhase = (next: FormPhase) => {
    setPhase(next);
    setFormError(null);
  };

  // Derived values update live while typing.
  const initialQty = parseNumber(values.initialQty);
  const purchasePrice = parseNumber(values.purchasePrice);
  const reductionPct = parseNumber(values.reductionPct);
  const autoNetYield = computeNetYield(initialQty, reductionPct);
  const netYield = values.netYieldOverridden ? parseNumber(values.netYield) : autoNetYield;
  const saleActive = isSaleActive(values);
  const totals = computeTotals(
    netYield,
    initialQty,
    purchasePrice,
    saleActive ? parseNumber(values.sellingPrice) : null,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validate(values);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);

    const payload: ProjectPayload = {
      // Fase 1
      name: values.name.trim(),
      productName: values.productName.trim(),
      processType: resolveProcessType(values),
      initialQty,
      purchasePrice,
      reductionPct,
      netYieldOverridden: values.netYieldOverridden,
      // Only send netYield when the user explicitly overrode it.
      ...(values.netYieldOverridden ? { netYield } : {}),
      // Fase 2: omit ALL sale fields when the sale is not active (clears it).
      ...(saleActive
        ? {
            sellingPrice: parseNumber(values.sellingPrice),
            buyerName: values.buyerName.trim(),
            ...(values.buyerContact.trim() ? { buyerContact: values.buyerContact.trim() } : {}),
            transactionDate: values.transactionDate,
            paymentType: values.paymentType,
            ...(values.paymentType === 'Crédito'
              ? { scheduledPaymentDate: values.scheduledPaymentDate }
              : {}),
          }
        : {}),
    };

    const onSuccess = (saved: Project) => navigate(`/projects/${saved.id}`);

    if (project) {
      updateMutation.mutate(payload, { onSuccess });
    } else {
      createMutation.mutate(payload, { onSuccess });
    }
  }

  return (
    <>
      <PageHeader
        title={project ? 'Editar proyecto' : 'Nuevo proyecto'}
        subtitle={project ? project.name : 'Registra un lote y sus números.'}
        backTo={project ? `/projects/${project.id}` : '/'}
      />

      {!project ? (
        <p className="mb-6 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
          Paso 1 de 2: registra la compra y el procesamiento. Después de guardar podrás completar
          la venta.
        </p>
      ) : null}

      {/* Phase switcher (only meaningful once the project exists) */}
      {project ? (
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => changePhase(1)}
            className={cn(
              'min-h-11 rounded-lg px-2 text-sm font-medium transition-colors',
              phase === 1 ? 'bg-white text-ink shadow-sm' : 'text-slate-500',
            )}
          >
            1. Compra y Procesamiento
          </button>
          <button
            type="button"
            onClick={() => changePhase(2)}
            className={cn(
              'min-h-11 rounded-lg px-2 text-sm font-medium transition-colors',
              phase === 2 ? 'bg-white text-ink shadow-sm' : 'text-slate-500',
            )}
          >
            2. Venta
            {project.sellingPrice === null ? (
              <span className="ml-1 text-amber-500" aria-label="venta pendiente">
                •
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* ================= Fase 1: compra y procesamiento ================= */}
        {phase === 1 || !project ? (
          <>
            <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Proyecto
              </h2>

              <Field label="Nombre del proyecto" htmlFor="name">
                <Input
                  id="name"
                  value={values.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Lote 1 de piña"
                  autoComplete="off"
                />
              </Field>

              <Field label="Nombre del producto" htmlFor="productName">
                <Input
                  id="productName"
                  value={values.productName}
                  onChange={(e) => patch({ productName: e.target.value })}
                  placeholder="Piña"
                  autoComplete="off"
                />
              </Field>

              <Field label="Tipo de proceso" htmlFor="processType">
                <Select
                  id="processType"
                  value={values.processType}
                  onChange={(e) => patch({ processType: e.target.value as ProcessTypeOption })}
                >
                  {PROCESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </Field>

              {values.processType === 'Otro' ? (
                <Field label="Nombre del proceso personalizado" htmlFor="customProcessType">
                  <Input
                    id="customProcessType"
                    value={values.customProcessType}
                    onChange={(e) => patch({ customProcessType: e.target.value })}
                    placeholder="Ej.: Melada en panela"
                    autoComplete="off"
                  />
                </Field>
              ) : null}
            </section>

            <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Materia prima
              </h2>

              <Field label="Cantidad inicial (kg)" htmlFor="initialQty">
                <Input
                  id="initialQty"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  value={values.initialQty}
                  onChange={(e) => patch({ initialQty: e.target.value })}
                  placeholder="10"
                />
              </Field>

              <Field label="Precio de compra (por kg)" htmlFor="purchasePrice">
                <Input
                  id="purchasePrice"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={values.purchasePrice}
                  onChange={(e) => patch({ purchasePrice: e.target.value })}
                  placeholder="2500"
                />
              </Field>
            </section>

            <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Procesamiento
              </h2>

              <Field label="Reducción de peso (%)" htmlFor="reductionPct">
                <Input
                  id="reductionPct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max="100"
                  value={values.reductionPct}
                  onChange={(e) => patch({ reductionPct: e.target.value })}
                  placeholder="20"
                />
              </Field>

              {/* Manual override toggle */}
              <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-4">
                <span className="text-sm font-medium text-slate-600">
                  Ajustar rendimiento neto manualmente
                </span>
                <span className="relative inline-flex shrink-0">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={values.netYieldOverridden}
                    onChange={(e) =>
                      patch({
                        netYieldOverridden: e.target.checked,
                        // Prefill with the auto value when enabling the override.
                        netYield: e.target.checked ? String(autoNetYield) : '',
                      })
                    }
                  />
                  <span className="block h-7 w-12 rounded-full bg-stone-200 transition-colors peer-checked:bg-brand" />
                  <span className="absolute left-0.5 top-0.5 block h-6 w-6 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                </span>
              </label>

              <Field
                label="Rendimiento neto (kg)"
                htmlFor="netYield"
                hint={
                  values.netYieldOverridden
                    ? 'Ajuste manual activado.'
                    : 'Calculado automáticamente: cantidad inicial × (1 − reducción%).'
                }
              >
                <Input
                  id="netYield"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  value={values.netYieldOverridden ? values.netYield : String(autoNetYield)}
                  disabled={!values.netYieldOverridden}
                  onChange={(e) => patch({ netYield: e.target.value })}
                  className={values.netYieldOverridden ? undefined : 'bg-stone-50'}
                />
              </Field>
            </section>
          </>
        ) : null}

        {/* ======================== Fase 2: venta ========================== */}
        {project && phase === 2 ? (
          <>
            {!saleActive ? (
              <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
                Completa estos datos para registrar la venta. Si los dejas vacíos, el proyecto
                queda solo con la Fase 1.
              </p>
            ) : null}

            <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Comprador
              </h2>

              <Field label="Nombre del comprador" htmlFor="buyerName">
                <Input
                  id="buyerName"
                  value={values.buyerName}
                  onChange={(e) => patch({ buyerName: e.target.value })}
                  placeholder="Ej.: Mercado La Esquina"
                  autoComplete="off"
                />
              </Field>

              <Field label="Contacto (opcional)" htmlFor="buyerContact">
                <Input
                  id="buyerContact"
                  type="tel"
                  value={values.buyerContact}
                  onChange={(e) => patch({ buyerContact: e.target.value })}
                  placeholder="Teléfono o correo"
                  autoComplete="off"
                />
              </Field>
            </section>

            <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Venta
              </h2>

              <Field
                label="Precio de venta (por kg de rendimiento neto)"
                htmlFor="sellingPrice"
                hint="Precio al que vendes el producto procesado."
              >
                <Input
                  id="sellingPrice"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={values.sellingPrice}
                  onChange={(e) => patch({ sellingPrice: e.target.value })}
                  placeholder="6000"
                />
              </Field>

              <Field label="Fecha de la transacción" htmlFor="transactionDate">
                <Input
                  id="transactionDate"
                  type="date"
                  value={values.transactionDate}
                  onChange={(e) => patch({ transactionDate: e.target.value })}
                />
              </Field>
            </section>

            <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pago</h2>

              <Field label="Tipo de pago" htmlFor="paymentType">
                <Select
                  id="paymentType"
                  value={values.paymentType}
                  onChange={(e) => {
                    const paymentType = e.target.value as PaymentType;
                    // "Contado" can never carry a scheduled payment date.
                    patch(
                      paymentType === 'Contado'
                        ? { paymentType, scheduledPaymentDate: '' }
                        : { paymentType },
                    );
                  }}
                >
                  <option value="Contado">Contado</option>
                  <option value="Crédito">Crédito</option>
                </Select>
              </Field>

              {values.paymentType === 'Crédito' ? (
                <Field
                  label="Fecha programada de pago"
                  htmlFor="scheduledPaymentDate"
                  hint="Debe ser posterior a hoy. El estado cambiará a “Vencido” si no se paga a tiempo."
                >
                  <Input
                    id="scheduledPaymentDate"
                    type="date"
                    value={values.scheduledPaymentDate}
                    onChange={(e) => patch({ scheduledPaymentDate: e.target.value })}
                  />
                </Field>
              ) : null}
            </section>
          </>
        ) : null}

        {/* Financial summary */}
        <SummaryCard
          totals={totals}
          rows={[{ label: 'Rendimiento neto', value: formatQty(netYield) }]}
        />

        {/* Errors */}
        {formError ? (
          <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>
        ) : null}
        {mutationError ? (
          <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{mutationError.message}</p>
        ) : null}

        {/* Sticky large submit button */}
        <div className="sticky bottom-4">
          <Button type="submit" fullWidth disabled={isSaving}>
            {isSaving ? 'Guardando…' : project ? 'Guardar cambios' : 'Crear proyecto'}
          </Button>
        </div>
      </form>
    </>
  );
}
