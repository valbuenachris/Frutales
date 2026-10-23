import { z } from 'zod';
import { PAYMENT_TYPES } from './projects.calc.js';

/**
 * Body schema for creating/updating a project (DTO validation layer).
 * Messages are user-facing and written in Spanish; identifiers stay English.
 *
 * Phase 1 fields are always required. Phase 2 (venta) fields are optional as
 * a group: send none of them to save/clear the sale, or send the complete set
 * (the cross-field rules below enforce it). Never send explicit `null`s —
 * omitted keys mean "not provided".
 *
 * `netYield` handling rules:
 *  - `netYieldOverridden: false` (default) -> the server ignores any sent
 *    `netYield` and derives it as initialQty * (1 - reductionPct / 100),
 *    so the stored value can never contradict the inputs.
 *  - `netYieldOverridden: true` -> the sent `netYield` is stored as-is.
 */

/** "YYYY-MM-DD" with a real calendar date (rejects e.g. 2026-02-30). */
const isDateOnly = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const dateOnlySchema = z
  .string({ error: 'La fecha no es válida' })
  .trim()
  .refine(isDateOnly, 'La fecha no es válida (usa el formato AAAA-MM-DD)');

/** Sale currencies: Colombian pesos or US dollars. */
export const SALE_CURRENCIES = ['COP', 'USD'] as const;
export type SaleCurrency = (typeof SALE_CURRENCIES)[number];

/**
 * Topes alineados con la capacidad real de las columnas de la base de datos
 * (se aceptan valores grandes, p. ej. abonos de cientos de millones):
 *  - Decimal(12,2) para montos y precios -> hasta 9.999.999.999,99
 *  - Decimal(12,3) para gramos           -> hasta 999.999.999,999
 * El dinero y los gramos son enteros; solo la caída/merma lleva decimales.
 */
export const MONEY_MAX = 9_999_999_999.99;
export const QTY_MAX = 999_999_999.999;

/** Base64 data URL of a receipt image. Empty string means "no image" (clear). */
const IMAGE_DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/;
export const imageDataUrlSchema = z
  .string({ error: 'La imagen no es válida' })
  .trim()
  .max(2_000_000, 'La imagen es demasiado grande (máximo 2 MB)')
  .refine(
    (value) => value === '' || IMAGE_DATA_URL_RE.test(value),
    'La imagen debe ser un archivo JPEG, PNG o WebP',
  );

export const projectInputSchema = z
  .object({
    // ------------------------- Fase 1: compra y procesamiento -----------------
    name: z
      .string({ error: 'El nombre del proyecto es obligatorio' })
      .trim()
      .min(1, 'El nombre del proyecto es obligatorio')
      .max(120, 'El nombre del proyecto no puede superar los 120 caracteres'),
    productName: z
      .string({ error: 'El nombre del producto es obligatorio' })
      .trim()
      .min(1, 'El nombre del producto es obligatorio')
      .max(120, 'El nombre del producto no puede superar los 120 caracteres'),
    initialQty: z.coerce
      .number({ error: 'La cantidad inicial debe ser un número' })
      .int('La cantidad inicial no puede tener decimales')
      .positive('La cantidad inicial debe ser mayor que 0')
      .max(QTY_MAX, 'La cantidad inicial es demasiado grande'),
    purchasePrice: z.coerce
      .number({ error: 'El precio de compra debe ser un número' })
      .int('El precio de compra no puede tener decimales')
      .min(0, 'El precio de compra no puede ser negativo')
      .max(MONEY_MAX, 'El precio de compra es demasiado alto'),
    reductionPct: z.coerce
      .number({ error: 'El porcentaje de merma debe ser un número' })
      .min(0, 'El porcentaje de merma no puede ser negativo')
      .max(100, 'El porcentaje de merma no puede superar el 100%'),
    netYield: z.coerce
      .number({ error: 'El rendimiento neto debe ser un número' })
      .int('El rendimiento neto no puede tener decimales')
      .min(0, 'El rendimiento neto no puede ser negativo')
      .max(QTY_MAX, 'El rendimiento neto es demasiado grande')
      .optional(),
    netYieldOverridden: z
      .boolean({ error: 'El ajuste manual debe ser verdadero o falso' })
      .optional()
      .default(false),
    // Compra: moneda (COP por defecto), TRM si es en dólares y comprobante.
    purchaseCurrency: z
      .enum(SALE_CURRENCIES, { error: 'La moneda de compra debe ser "COP" (pesos) o "USD" (dólares)' })
      .optional(),
    purchaseExchangeRate: z.coerce
      .number({ error: 'El precio del dólar debe ser un número' })
      .int('El precio del dólar no puede tener decimales')
      .positive('El precio del dólar debe ser mayor que 0')
      .max(100_000, 'El precio del dólar es demasiado alto')
      .optional(),
    purchaseImage: imageDataUrlSchema.optional(),

    // ------------------------- Fase 2: venta (opcional) -----------------------
    sellingPrice: z.coerce
      .number({ error: 'El precio de venta debe ser un número' })
      .int('El precio de venta no puede tener decimales')
      .min(0, 'El precio de venta no puede ser negativo')
      .max(MONEY_MAX, 'El precio de venta es demasiado alto')
      .optional(),
    buyerName: z
      .string({ error: 'El nombre del comprador debe ser texto' })
      .trim()
      .max(120, 'El nombre del comprador no puede superar los 120 caracteres')
      .optional(),
    buyerContact: z
      .string({ error: 'El contacto del comprador debe ser texto' })
      .trim()
      .max(60, 'El contacto del comprador no puede superar los 60 caracteres')
      .optional(),
    transactionDate: dateOnlySchema.optional(),
    paymentType: z
      .enum(PAYMENT_TYPES, { error: 'El tipo de pago debe ser "Contado" o "Crédito"' })
      .optional(),
    scheduledPaymentDate: dateOnlySchema.optional(),
    currency: z.enum(SALE_CURRENCIES, { error: 'La moneda debe ser "COP" (pesos) o "USD" (dólares)' }).optional(),
    /**
     * COP per USD for the sale. Optional: when a USD sale arrives without it,
     * the service fetches the current TRM as a fallback; when provided it is
     * stored as the historical record of that sale.
     */
    exchangeRate: z.coerce
      .number({ error: 'El precio del dólar debe ser un número' })
      .int('El precio del dólar no puede tener decimales')
      .positive('El precio del dólar debe ser mayor que 0')
      .max(100_000, 'El precio del dólar es demasiado alto')
      .optional(),
    saleImage: imageDataUrlSchema.optional(),
  })
  .superRefine((data, ctx) => {
    // A sale is registered when any Phase 2 field is present; then the
    // essential ones must all be present. Sending none clears the sale.
    const hasSale =
      data.sellingPrice !== undefined ||
      data.buyerName !== undefined ||
      data.buyerContact !== undefined ||
      data.transactionDate !== undefined ||
      data.paymentType !== undefined ||
      data.scheduledPaymentDate !== undefined ||
      data.currency !== undefined ||
      data.exchangeRate !== undefined ||
      data.saleImage !== undefined;

    if (!hasSale) return;

    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });

    if (data.sellingPrice === undefined) {
      issue('sellingPrice', 'El precio de venta es obligatorio cuando se registra la venta');
    }
    if (!data.buyerName) {
      issue('buyerName', 'El nombre del comprador es obligatorio cuando se registra la venta');
    }
    if (data.transactionDate === undefined) {
      issue('transactionDate', 'La fecha de la transacción es obligatoria cuando se registra la venta');
    }
    if (data.paymentType === undefined) {
      issue('paymentType', 'El tipo de pago es obligatorio cuando se registra la venta');
    }
    if (data.paymentType === 'Crédito' && data.scheduledPaymentDate === undefined) {
      issue('scheduledPaymentDate', 'La fecha programada de pago es obligatoria para pagos a crédito');
    }
    if (data.paymentType === 'Contado' && data.scheduledPaymentDate !== undefined) {
      issue('scheduledPaymentDate', 'No se puede indicar una fecha programada de pago con pago de contado');
    }
  });

export type ProjectInput = z.infer<typeof projectInputSchema>;

/** Route params for /api/projects/:id */
export const projectIdParamSchema = z.object({
  id: z
    .string({ error: 'El identificador del proyecto no es válido' })
    .trim()
    .min(1, 'El identificador del proyecto no es válido'),
});
