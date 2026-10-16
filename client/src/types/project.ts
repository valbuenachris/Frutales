/** Fase 2: forma de pago de la venta. */
export type PaymentType = 'Contado' | 'Crédito';

/** Fase 2: estado del pago, derivado por el servidor a partir de las fechas. */
export type PaymentStatus = 'Pendiente' | 'Pagado' | 'Vencido';

/** API shape of a project, as returned by the Express backend. */
export interface Project {
  id: string;
  name: string;
  productName: string;
  processType: string;
  initialQty: number;
  purchasePrice: number;
  reductionPct: number;
  netYield: number;
  netYieldOverridden: boolean;
  // Fase 2: venta (null hasta que se registre la venta)
  sellingPrice: number | null;
  buyerName: string | null;
  buyerContact: string | null;
  transactionDate: string | null;
  paymentType: PaymentType | null;
  scheduledPaymentDate: string | null;
  paymentStatus: PaymentStatus | null;
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
  processType: string;
  initialQty: number;
  purchasePrice: number;
  reductionPct: number;
  /** Only sent when the user manually overrides the auto-calculated yield. */
  netYield?: number;
  netYieldOverridden: boolean;
  // Fase 2: venta
  sellingPrice?: number;
  buyerName?: string;
  buyerContact?: string;
  /** "YYYY-MM-DD" (native date input). */
  transactionDate?: string;
  paymentType?: PaymentType;
  /** "YYYY-MM-DD"; only for paymentType "Crédito". */
  scheduledPaymentDate?: string;
}
