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

const dateOnlySchema = z
  .string({ error: 'La fecha no es válida' })
  .trim()
  .refine(isDateOnly, 'La fecha no es válida (usa el formato AAAA-MM-DD)');

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
    processType: z
      .string({ error: 'El tipo de proceso es obligatorio' })
      .trim()
      .min(1, 'El tipo de proceso es obligatorio')
      .max(60, 'El tipo de proceso no puede superar los 60 caracteres'),
    initialQty: z.coerce
      .number({ error: 'La cantidad inicial debe ser un número' })
      .positive('La cantidad inicial debe ser mayor que 0')
      .max(1_000_000, 'La cantidad inicial es demasiado grande'),
    purchasePrice: z.coerce
      .number({ error: 'El precio de compra debe ser un número' })
      .min(0, 'El precio de compra no puede ser negativo')
      .max(100_000_000, 'El precio de compra es demasiado alto'),
    reductionPct: z.coerce
      .number({ error: 'El porcentaje de reducción debe ser un número' })
      .min(0, 'El porcentaje de reducción no puede ser negativo')
      .max(100, 'El porcentaje de reducción no puede superar el 100%'),
    netYield: z.coerce
      .number({ error: 'El rendimiento neto debe ser un número' })
      .min(0, 'El rendimiento neto no puede ser negativo')
      .max(1_000_000, 'El rendimiento neto es demasiado grande')
      .optional(),
    netYieldOverridden: z
      .boolean({ error: 'El ajuste manual debe ser verdadero o falso' })
      .optional()
      .default(false),

    // ------------------------- Fase 2: venta (opcional) -----------------------
    sellingPrice: z.coerce
      .number({ error: 'El precio de venta debe ser un número' })
      .min(0, 'El precio de venta no puede ser negativo')
      .max(100_000_000, 'El precio de venta es demasiado alto')
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
      data.scheduledPaymentDate !== undefined;

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
