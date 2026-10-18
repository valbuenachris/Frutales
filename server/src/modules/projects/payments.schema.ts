import { z } from 'zod';
import { dateOnlySchema, imageDataUrlSchema, SALE_CURRENCIES } from './projects.schema.js';

/** DTO for an abono / pago parcial of a sale. Messages are user-facing Spanish. */
export const paymentInputSchema = z.object({
  amount: z.coerce
    .number({ error: 'El monto del pago debe ser un número' })
    .positive('El monto del pago debe ser mayor que 0')
    .max(100_000_000, 'El monto del pago es demasiado alto'),
  /** "COP" (default) or "USD". */
  currency: z
    .enum(SALE_CURRENCIES, { error: 'La moneda debe ser "COP" (pesos) o "USD" (dólares)' })
    .optional(),
  /** TRM (COP por USD); obligatoria para pagos en dólares si no hay TRM en vivo. */
  exchangeRate: z.coerce
    .number({ error: 'El precio del dólar debe ser un número' })
    .positive('El precio del dólar debe ser mayor que 0')
    .max(100_000, 'El precio del dólar es demasiado alto')
    .optional(),
  /** Nota u observación opcional ("abono quincenal", ...). */
  note: z
    .string({ error: 'La nota debe ser texto' })
    .trim()
    .max(160, 'La nota no puede superar los 160 caracteres')
    .optional(),
  /** Comprobante del pago (data URL); "" lo borra. */
  image: imageDataUrlSchema.optional(),
  /** "YYYY-MM-DD"; optional, defaults to null (sin fecha). */
  date: dateOnlySchema.optional(),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

/** Route params for /api/projects/:projectId/payments/:paymentId */
export const paymentParamsSchema = z.object({
  projectId: z
    .string({ error: 'El identificador del proyecto no es válido' })
    .trim()
    .min(1, 'El identificador del proyecto no es válido'),
  paymentId: z
    .string({ error: 'El identificador del pago no es válido' })
    .trim()
    .min(1, 'El identificador del pago no es válido')
    .optional(),
});
