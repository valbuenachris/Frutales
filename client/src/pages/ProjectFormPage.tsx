import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/Feedback';
import { ExpensesSection } from '../components/ExpensesSection';
import { PageHeader } from '../components/Layout';
import { PaymentsSection } from '../components/PaymentsSection';
import { SummaryCard } from '../components/SummaryCard';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { MoneyField } from '../components/ui/MoneyField';
import { Select } from '../components/ui/Select';
import { useCreateProject, useProject, useUpdateProject } from '../hooks/useProjects';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { productHooks, processHooks } from '../hooks/useCatalog';
import { computeNetYield, computeTotals, parseNumber } from '../lib/calc';
import { cn, formatMoney, formatMoneyUsd, formatQty, toDateInputValue, todayInputValue } from '../lib/format';
import type { PaymentType, Project, ProjectPayload, SaleCurrency } from '../types/project';

type FormPhase = 1 | 2;

interface ProjectFormValues {
  // Fase 1: compra y procesamiento
  name: string;
  productName: string;
  processType: string;
  initialQty: string;
  purchasePrice: string;
  purchaseCurrency: SaleCurrency;
  purchaseExchangeRate: string; // COP por USD (solo compras en dólares)
  purchaseImage: string | null;
  reductionPct: string;
  netYieldOverridden: boolean;
  netYield: string;
  // Fase 2: venta
  buyerName: string;
  buyerContact: string;
  transactionDate: string; // YYYY-MM-DD
  sellingPrice: string;
  currency: SaleCurrency;
  exchangeRate: string; // COP por USD (solo ventas en dólares)
  saleImage: string | null;
  paymentType: PaymentType;
  scheduledPaymentDate: string; // YYYY-MM-DD, only for "Crédito"
}

const EMPTY_VALUES: ProjectFormValues = {
  name: '',
  productName: '',
  processType: '',
  initialQty: '',
  purchasePrice: '',
  purchaseCurrency: 'COP',
  purchaseExchangeRate: '',
  purchaseImage: null,
  reductionPct: '0',
  netYieldOverridden: false,
  netYield: '',
  buyerName: '',
  buyerContact: '',
  transactionDate: todayInputValue(),
  sellingPrice: '',
  currency: 'COP',
  exchangeRate: '',
  saleImage: null,
  paymentType: 'Contado',
  scheduledPaymentDate: '',
};

/** Prefill the form when editing; reset when creating. */
function toFormValues(project?: Project): ProjectFormValues {
  if (!project) return EMPTY_VALUES;

  return {
    name: project.name,
    productName: project.productName,
    processType: project.processType,
    initialQty: String(project.initialQty),
    purchasePrice: String(project.purchasePrice),
    purchaseCurrency: project.purchaseCurrency === 'USD' ? 'USD' : 'COP',
    purchaseExchangeRate:
      project.purchaseExchangeRate !== null ? String(project.purchaseExchangeRate) : '',
    purchaseImage: project.purchaseImage,
    reductionPct: String(project.reductionPct),
    netYieldOverridden: project.netYieldOverridden,
    netYield: project.netYieldOverridden ? String(project.netYield) : '',
    buyerName: project.buyerName ?? '',
    buyerContact: project.buyerContact ?? '',
    transactionDate: project.transactionDate
      ? toDateInputValue(new Date(project.transactionDate))
      : todayInputValue(),
    sellingPrice: project.sellingPrice !== null ? String(project.sellingPrice) : '',
    currency: project.currency === 'USD' ? 'USD' : 'COP',
    exchangeRate: project.exchangeRate !== null ? String(project.exchangeRate) : '',
    saleImage: project.saleImage,
    paymentType: project.paymentType === 'Crédito' ? 'Crédito' : 'Contado',
    scheduledPaymentDate: project.scheduledPaymentDate
      ? toDateInputValue(new Date(project.scheduledPaymentDate))
      : '',
  };
}

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
  if (!values.processType.trim()) return 'El tipo de proceso es obligatorio.';
  if (parseNumber(values.initialQty) <= 0) return 'La cantidad inicial debe ser mayor que 0.';
  if (parseNumber(values.purchasePrice) < 0) return 'El precio de compra no puede ser negativo.';
  if (values.purchaseCurrency === 'USD' && parseNumber(values.purchaseExchangeRate) <= 0)
    return 'El precio del dólar es obligatorio para la compra en dólares.';
  const reduction = parseNumber(values.reductionPct);
  if (reduction < 0 || reduction > 100) return 'La merma debe estar entre 0 y 100.';
  if (values.netYieldOverridden && parseNumber(values.netYield) < 0)
    return 'El rendimiento neto no puede ser negativo.';

  // Fase 2 (only validated when the sale is being registered)
  if (isSaleActive(values)) {
    if (!values.buyerName.trim()) return 'El nombre del comprador es obligatorio.';
    if (parseNumber(values.sellingPrice) < 0) return 'El precio de venta no puede ser negativo.';
    if (values.sellingPrice.trim() === '') return 'El precio de venta es obligatorio.';
    if (values.currency === 'USD' && parseNumber(values.exchangeRate) <= 0)
      return 'El precio del dólar es obligatorio para ventas en dólares.';
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

  // TRM preview, fetched only while a USD purchase or sale is being edited.
  const purchaseRateQuery = useExchangeRate(values.purchaseCurrency === 'USD');
  const exchangeRateQuery = useExchangeRate(values.currency === 'USD');

  // Catálogos maestros: los selectores muestran solo lo registrado en las
  // secciones de Productos y Procesos.
  const productsQuery = productHooks.useList();
  const processesQuery = processHooks.useList();
  const productNames = (productsQuery.data ?? []).map((product) => product.name);
  const processNames = (processesQuery.data ?? []).map((process) => process.name);
  // Si el proyecto editado trae un valor que ya no está en el catálogo, se
  // conserva como opción extra para no perder el dato al guardar.
  const productOptions =
    values.productName && !productNames.includes(values.productName)
      ? [values.productName, ...productNames]
      : productNames;
  const processOptions =
    values.processType && !processNames.includes(values.processType)
      ? [values.processType, ...processNames]
      : processNames;

  const patch = (partial: Partial<ProjectFormValues>) =>
    setValues((prev) => ({ ...prev, ...partial }));

  const changePhase = (next: FormPhase) => {
    setPhase(next);
    setFormError(null);
  };

  // Prefill the USD rates with the current TRM once it loads (user can adjust).
  useEffect(() => {
    if (
      values.purchaseCurrency === 'USD' &&
      values.purchaseExchangeRate.trim() === '' &&
      purchaseRateQuery.data
    ) {
      patch({ purchaseExchangeRate: String(purchaseRateQuery.data.rate) });
    }
  }, [values.purchaseCurrency, values.purchaseExchangeRate, purchaseRateQuery.data]);

  useEffect(() => {
    if (values.currency === 'USD' && values.exchangeRate.trim() === '' && exchangeRateQuery.data) {
      patch({ exchangeRate: String(exchangeRateQuery.data.rate) });
    }
  }, [values.currency, values.exchangeRate, exchangeRateQuery.data]);

  // Derived values update live while typing.
  const initialQty = parseNumber(values.initialQty);
  const purchasePrice = parseNumber(values.purchasePrice);
  const reductionPct = parseNumber(values.reductionPct);
  const autoNetYield = computeNetYield(initialQty, reductionPct);
  const netYield = values.netYieldOverridden ? parseNumber(values.netYield) : autoNetYield;
  const saleActive = isSaleActive(values);
  const purchaseRate = parseNumber(values.purchaseExchangeRate);
  const usdRate = parseNumber(values.exchangeRate);
  // USD amounts are converted to COP with the rates shown in the form.
  const pricePerKgCop =
    values.purchaseCurrency === 'USD' ? purchasePrice * purchaseRate : purchasePrice;
  const priceInCop =
    values.currency === 'USD'
      ? parseNumber(values.sellingPrice) * usdRate
      : parseNumber(values.sellingPrice);
  // Registered expenses (edited from the details screen) count towards the cost.
  const registeredExpenses = project?.expensesTotal ?? 0;
  const totals = computeTotals(
    netYield,
    initialQty,
    pricePerKgCop,
    saleActive ? priceInCop : null,
    registeredExpenses,
  );

  const summaryRows = [{ label: 'Rendimiento neto', value: formatQty(netYield) }];
  if (netYield > 0 && (totals.totalCost + registeredExpenses) > 0) {
    // (Costo de compra + gastos) ÷ kg de producto terminado.
    summaryRows.push({
      label: 'Costo por kg de producto',
      value: `${formatMoney((totals.totalCost + registeredExpenses) / netYield)} / kg`,
    });
  }
  if (totals.netProfit !== null && netYield > 0) {
    summaryRows.push({
      label: 'Ganancia neta por kg',
      value: `${formatMoney(totals.netProfit / netYield)} / kg`,
    });
  }
  if (values.purchaseCurrency === 'USD') {
    summaryRows.push(
      { label: 'Compra en dólares', value: formatMoneyUsd(initialQty * purchasePrice) },
      { label: 'Precio del dólar (compra)', value: formatMoney(purchaseRate) },
    );
  }
  if (registeredExpenses > 0) {
    summaryRows.push({ label: 'Gastos registrados', value: formatMoney(registeredExpenses) });
  }
  if (saleActive && values.currency === 'USD') {
    summaryRows.push(
      {
        label: 'Ingreso en dólares',
        value: formatMoneyUsd(netYield * parseNumber(values.sellingPrice)),
      },
      { label: 'Precio del dólar', value: formatMoney(usdRate) },
    );
  }

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
      processType: values.processType,
      initialQty,
      purchasePrice,
      purchaseCurrency: values.purchaseCurrency,
      ...(values.purchaseCurrency === 'USD'
        ? { purchaseExchangeRate: parseNumber(values.purchaseExchangeRate) }
        : {}),
      ...(values.purchaseImage ? { purchaseImage: values.purchaseImage } : {}),
      reductionPct,
      netYieldOverridden: values.netYieldOverridden,
      // Only send netYield when the user explicitly overrode it.
      ...(values.netYieldOverridden ? { netYield } : {}),
      // Fase 2: omit ALL sale fields when the sale is not active (clears it).
      ...(saleActive
        ? {
            sellingPrice: parseNumber(values.sellingPrice),
            currency: values.currency,
            ...(values.currency === 'USD'
              ? { exchangeRate: parseNumber(values.exchangeRate) }
              : {}),
            ...(values.saleImage ? { saleImage: values.saleImage } : {}),
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
          Paso 1 de 2: registra la compra y el procesamiento. Después de guardar podrás agregar
          los gastos y completar la venta.
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

              <Field
                label="Nombre del producto"
                htmlFor="productName"
                hint={
                  productNames.length === 0
                    ? 'Aún no hay productos en el catálogo. Agrégalos en la sección Productos.'
                    : 'Se administran en la sección Productos.'
                }
              >
                <Select
                  id="productName"
                  value={values.productName}
                  onChange={(e) => patch({ productName: e.target.value })}
                >
                  <option value="" disabled>
                    Selecciona un producto…
                  </option>
                  {productOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Tipo de proceso"
                htmlFor="processType"
                hint={
                  processNames.length === 0
                    ? 'Aún no hay procesos en el catálogo. Agrégalos en la sección Procesos.'
                    : 'Se administran en la sección Procesos.'
                }
              >
                <Select
                  id="processType"
                  value={values.processType}
                  onChange={(e) => patch({ processType: e.target.value })}
                >
                  <option value="" disabled>
                    Selecciona un proceso…
                  </option>
                  {processOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
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

              <MoneyField
                id="purchasePrice"
                label={
                  values.purchaseCurrency === 'USD'
                    ? 'Precio de compra (US$ por kg)'
                    : 'Precio de compra (por kg)'
                }
                amount={values.purchasePrice}
                onAmountChange={(value) => patch({ purchasePrice: value })}
                currency={values.purchaseCurrency}
                onCurrencyChange={(currency) =>
                  patch(
                    currency === 'COP'
                      ? { purchaseCurrency: currency, purchaseExchangeRate: '' }
                      : { purchaseCurrency: currency },
                  )
                }
                exchangeRate={values.purchaseExchangeRate}
                onExchangeRateChange={(value) => patch({ purchaseExchangeRate: value })}
                image={values.purchaseImage}
                onImageChange={(image) => patch({ purchaseImage: image })}
                placeholder={values.purchaseCurrency === 'USD' ? '2' : '2500'}
                rateInfo={purchaseRateQuery.data}
                rateLoading={purchaseRateQuery.isPending}
                rateError={purchaseRateQuery.isError}
              />
            </section>

            <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Procesamiento
              </h2>

              <Field label="Caída/Merma (%)" htmlFor="reductionPct">
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
                    : 'Calculado automáticamente: cantidad inicial × (1 − merma%).'
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

            {/* Gastos de la Fase 1 (disponibles después de guardar el proyecto) */}
            {project ? (
              <ExpensesSection
                projectId={project.id}
                expenses={project.expenses}
                expensesTotal={project.expensesTotal}
              />
            ) : null}
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

              <MoneyField
                id="sellingPrice"
                label={
                  values.currency === 'USD'
                    ? 'Precio de venta (US$ por kg de rendimiento neto)'
                    : 'Precio de venta (por kg de rendimiento neto)'
                }
                hint="Precio al que vendes el producto procesado."
                amount={values.sellingPrice}
                onAmountChange={(value) => patch({ sellingPrice: value })}
                currency={values.currency}
                onCurrencyChange={(currency) =>
                  patch(
                    currency === 'COP' ? { currency, exchangeRate: '' } : { currency },
                  )
                }
                exchangeRate={values.exchangeRate}
                onExchangeRateChange={(value) => patch({ exchangeRate: value })}
                image={values.saleImage}
                onImageChange={(image) => patch({ saleImage: image })}
                placeholder={values.currency === 'USD' ? '1.5' : '6000'}
                rateInfo={exchangeRateQuery.data}
                rateLoading={exchangeRateQuery.isPending}
                rateError={exchangeRateQuery.isError}
              />

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

            {/* Abonos registrados (disponibles cuando la venta ya está guardada) */}
            {project && project.sellingPrice !== null ? (
              <PaymentsSection
                projectId={project.id}
                payments={project.payments}
                paidAmount={project.paidAmount}
                balance={project.balance}
                saleCurrency={project.currency ?? 'COP'}
              />
            ) : null}
          </>
        ) : null}

        {/* Financial summary */}
        <SummaryCard totals={totals} rows={summaryRows} />

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
