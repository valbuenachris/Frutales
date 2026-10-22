/** Fase 2: forma de pago de la venta. */
export type PaymentType = 'Contado' | 'Crédito';

/** Fase 2: estado del pago, derivado por el servidor (fechas + abonos). */
export type PaymentStatus = 'Pendiente' | 'Abonado' | 'Pagado' | 'Vencido';

/** Fase 2: moneda de la venta (pesos colombianos o dólares). */
export type SaleCurrency = 'COP' | 'USD';

/** Gasto adicional de un proyecto (empaque, transporte, ...). */
export interface Expense {
  id: string;
  concept: string;
  /** Monto en su moneda original. */
  amount: number;
  /** Moneda del monto; filas antiguas sin moneda se reportan como "COP". */
  currency: SaleCurrency;
  /** TRM capturada al registrar el gasto en dólares. */
  exchangeRate: number | null;
  /** Monto convertido a COP (para los totales). */
  amountCop: number;
  date: string | null;
  /** Comprobante (data URL); solo llega en las respuestas de detalle. */
  image: string | null;
  createdAt: string;
}

/** Abono o pago parcial registrado contra la venta. */
export interface Payment {
  id: string;
  /** Monto en su moneda original. */
  amount: number;
  currency: SaleCurrency;
  /** TRM capturada al registrar el pago en dólares. */
  exchangeRate: number | null;
  /** Monto convertido a COP (para el total abonado y el saldo). */
  amountCop: number;
  /** Nota u observación ("abono quincenal", ...). */
  note: string | null;
  date: string | null;
  /** Comprobante (data URL); solo llega en las respuestas de detalle. */
  image: string | null;
  createdAt: string;
}

/** API shape of a project, as returned by the Express backend. */
export interface Project {
  id: string;
  name: string;
  productName: string;
  initialQty: number;
  purchasePrice: number;
  /** Moneda del precio de compra; filas antiguas se reportan como "COP". */
  purchaseCurrency: SaleCurrency;
  /** TRM capturada al hacer la compra en dólares (COP por USD). */
  purchaseExchangeRate: number | null;
  /** Comprobante de compra (data URL); solo en respuestas de detalle. */
  purchaseImage: string | null;
  reductionPct: number;
  netYield: number;
  netYieldOverridden: boolean;
  // Fase 2: venta (null hasta que se registre la venta)
  sellingPrice: number | null;
  /** Moneda de la venta; filas antiguas sin moneda se reportan como "COP". */
  currency: SaleCurrency | null;
  /** TRM capturada al registrar la venta en dólares (COP por USD). */
  exchangeRate: number | null;
  /** Comprobante de venta (data URL); solo en respuestas de detalle. */
  saleImage: string | null;
  buyerName: string | null;
  buyerContact: string | null;
  transactionDate: string | null;
  paymentType: PaymentType | null;
  scheduledPaymentDate: string | null;
  paymentStatus: PaymentStatus | null;
  // Gastos del proyecto (se suman al costo total)
  expenses: Expense[];
  expensesTotal: number;
  // Abonos/pagos parciales de la venta
  payments: Payment[];
  /** Total abonado (COP); contado sin pagos registrados = ingreso total. */
  paidAmount: number;
  /** Saldo pendiente (ingreso − abonado); null si no hay venta. */
  balance: number | null;
  /** Costo de la materia prima (cantidad inicial × precio de compra). */
  purchaseCost: number;
  // Totales derivados (ingreso y ganancia solo existen si hay venta)
  totalCost: number;
  totalRevenue: number | null;
  netProfit: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Body sent when creating/updating a project.
 * Phase 2 fields are optional as a group: omit ALL of them when there is no
 * sale (sending any single one requires the complete set). Never send nulls:
 * omitted keys mean "not provided".
 */
export interface ProjectPayload {
  name: string;
  productName: string;
  initialQty: number;
  purchasePrice: number;
  /** "COP" (predeterminado) o "USD". */
  purchaseCurrency?: SaleCurrency;
  /** TRM (COP por USD); obligatoria para compras en dólares. */
  purchaseExchangeRate?: number;
  /** Comprobante de compra (data URL); omitir o "" para no tener imagen. */
  purchaseImage?: string;
  reductionPct: number;
  /** Only sent when the user manually overrides the auto-calculated yield. */
  netYield?: number;
  netYieldOverridden: boolean;
  // Fase 2: venta
  sellingPrice?: number;
  /** "COP" (predeterminado) o "USD". */
  currency?: SaleCurrency;
  /** TRM (COP por USD); obligatoria para ventas en dólares. */
  exchangeRate?: number;
  buyerName?: string;
  buyerContact?: string;
  /** "YYYY-MM-DD" (native date input). */
  transactionDate?: string;
  paymentType?: PaymentType;
  /** "YYYY-MM-DD"; only for paymentType "Crédito". */
  scheduledPaymentDate?: string;
  /** Comprobante de venta (data URL); omitir o "" para no tener imagen. */
  saleImage?: string;
}
