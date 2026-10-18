/**
 * Saneado del payload de proyectos (Fase 1 + Fase 2) antes de enviarlo al API.
 *
 * Contrato con el servidor (ver AGENTS.md): la Fase 2 se envía completa o no
 * se envía.
 *  - Con venta: el formulario debe entregar una `VentaCompleta` estricta
 *    (verificado en tiempo de compilación).
 *  - Sin venta: se pasa `null` y el slice emitido es exactamente `{}`, lo que
 *    limpia la venta registrada en el API.
 * Nunca se envían `null`: las llaves opcionales vacías se omiten del payload.
 * Los mensajes de error son visibles al usuario, en español (es-CO).
 */

import type { ProjectPayload, SaleCurrency } from '../types/project';

/** Llaves del payload que pertenecen a la Fase 2 (venta). */
type SaleKeys =
  | 'sellingPrice'
  | 'buyerName'
  | 'buyerContact'
  | 'transactionDate'
  | 'paymentType'
  | 'scheduledPaymentDate'
  | 'currency'
  | 'exchangeRate'
  | 'saleImage';

/** Slice de venta tal como viaja en el payload (opcional en el tipo base). */
export type VentaPayload = Pick<ProjectPayload, SaleKeys>;

/** Objeto vacío exacto: la única forma válida de representar "sin venta". */
export type SinVenta = Record<string, never>;

/**
 * Venta estricta que exige el contrato de la Fase 2 cuando se registra una
 * venta: los campos obligatorios se toman del payload (`Required<Pick<…>>`)
 * para no duplicar tipos, y los demás son los que el formulario siempre
 * conoce (el saneador decide si viajan u se omiten).
 */
export type VentaCompleta = Required<
  Pick<VentaPayload, 'sellingPrice' | 'buyerName' | 'transactionDate' | 'paymentType'>
> & {
  /** "COP" o "USD"; viaja siempre. */
  currency: SaleCurrency;
  /** TRM (COP por USD); obligatoria cuando `currency === 'USD'`. */
  exchangeRate: number;
  /** Se omite del payload si viene vacío. */
  buyerContact: string;
  /** Obligatoria para `paymentType === "Crédito"`; se omite si es contado. */
  scheduledPaymentDate: string;
  /** Data URL del comprobante o `null`; `null` se omite del payload. */
  saleImage: string | null;
};

/**
 * Tipo condicional de la Fase 2: con una `VentaCompleta` el resultado es el
 * slice de venta; con `null` es el objeto vacío `{}` (limpia la venta).
 */
export type PayloadFase2<V extends VentaCompleta | null> = V extends VentaCompleta
  ? VentaPayload
  : SinVenta;

/** Fase 1 ya normalizada: los números llegan parseados desde el formulario. */
export interface CompraNormalizada {
  name: string;
  productName: string;
  processType: string;
  initialQty: number;
  purchasePrice: number;
  purchaseCurrency: SaleCurrency;
  /** TRM (COP por USD); solo viaja si la compra es en dólares. */
  purchaseExchangeRate: number;
  /** Data URL o `null`; `null` se omite del payload. */
  purchaseImage: string | null;
  reductionPct: number;
  netYieldOverridden: boolean;
  /** Solo viaja si `netYieldOverridden` es verdadero. */
  netYield: number;
}

/** Entrada del saneador: Fase 1 completa + la venta (o `null`). */
export interface EntradaSaneado {
  compra: CompraNormalizada;
  venta: VentaCompleta | null;
}

/** Construye el slice de venta validando las reglas cruzadas del contrato. */
function buildVentaPayload(venta: VentaCompleta): VentaPayload {
  if (!Number.isFinite(venta.sellingPrice) || venta.sellingPrice < 0) {
    throw new Error('El precio de venta debe ser un número mayor o igual a 0.');
  }
  if (
    venta.currency === 'USD' &&
    !(Number.isFinite(venta.exchangeRate) && venta.exchangeRate > 0)
  ) {
    throw new Error('El precio del dólar es obligatorio para ventas en dólares.');
  }
  const buyerName = venta.buyerName.trim();
  if (!buyerName) {
    throw new Error('El nombre del comprador es obligatorio cuando se registra la venta.');
  }
  if (!venta.transactionDate) {
    throw new Error('La fecha de la transacción es obligatoria cuando se registra la venta.');
  }
  if (venta.paymentType === 'Crédito' && !venta.scheduledPaymentDate) {
    throw new Error('La fecha programada de pago es obligatoria para pagos a crédito.');
  }
  if (venta.paymentType === 'Contado' && venta.scheduledPaymentDate) {
    throw new Error('No puedes indicar una fecha programada de pago con pago de contado.');
  }

  const buyerContact = venta.buyerContact.trim();
  return {
    sellingPrice: venta.sellingPrice,
    currency: venta.currency,
    ...(venta.currency === 'USD' ? { exchangeRate: venta.exchangeRate } : {}),
    buyerName,
    ...(buyerContact ? { buyerContact } : {}),
    transactionDate: venta.transactionDate,
    paymentType: venta.paymentType,
    ...(venta.paymentType === 'Crédito'
      ? { scheduledPaymentDate: venta.scheduledPaymentDate }
      : {}),
    ...(venta.saleImage ? { saleImage: venta.saleImage } : {}),
  };
}

/**
 * Saneado de la Fase 2: `null` -> `{}` exacto; `VentaCompleta` -> slice de
 * venta saneado. El tipo de retorno depende del argumento (`PayloadFase2`).
 */
export function sanitizeFase2<V extends VentaCompleta | null>(venta: V): PayloadFase2<V> {
  if (venta === null) {
    // `{}` exacto: limpia la venta existente en el API.
    return {} as PayloadFase2<V>;
  }
  // El tipo condicional no se puede demostrar con el flujo de control del
  // compilador; el valor sí corresponde a la rama `VentaCompleta`.
  return buildVentaPayload(venta) as PayloadFase2<V>;
}

/** Saneado completo del payload: Fase 1 siempre + Fase 2 (completa o vacía). */
export function sanitizeProjectPayload(entrada: EntradaSaneado): ProjectPayload {
  const { compra, venta } = entrada;
  return {
    // Fase 1
    name: compra.name.trim(),
    productName: compra.productName.trim(),
    processType: compra.processType,
    initialQty: compra.initialQty,
    purchasePrice: compra.purchasePrice,
    purchaseCurrency: compra.purchaseCurrency,
    ...(compra.purchaseCurrency === 'USD'
      ? { purchaseExchangeRate: compra.purchaseExchangeRate }
      : {}),
    ...(compra.purchaseImage ? { purchaseImage: compra.purchaseImage } : {}),
    reductionPct: compra.reductionPct,
    netYieldOverridden: compra.netYieldOverridden,
    // Solo se envía netYield cuando el usuario lo ajustó manualmente.
    ...(compra.netYieldOverridden ? { netYield: compra.netYield } : {}),
    // Fase 2: se omite TODO cuando no hay venta (el `{}` la limpia).
    ...sanitizeFase2(venta),
  };
}