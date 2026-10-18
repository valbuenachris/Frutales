import { z } from 'zod';
import { dateOnlySchema, imageDataUrlSchema, SALE_CURRENCIES } from './projects.schema.js';

/** DTO for a project expense (gasto). Messages are user-facing Spanish. */
export const expenseInputSchema = z.object({
  concept: z
    .string({ error: 'El concepto del gasto es obligatorio' })
    .trim()
    .min(1, 'El concepto del gasto es obligatorio')
    .max(120, 'El concepto no puede superar los 120 caracteres'),
  amount: z.coerce
    .number({ error: 'El monto del gasto debe ser un número' })
    .positive('El monto del gasto debe ser mayor que 0')
    .max(100_000_000, 'El monto del gasto es demasiado alto'),
  /** "COP" (default) or "USD". */
  currency: z
    .enum(SALE_CURRENCIES, { error: 'La moneda debe ser "COP" (pesos) o "USD" (dólares)' })
    .optional(),
  /** TRM (COP por USD); obligatoria para gastos en dólares si no hay TRM en vivo. */
  exchangeRate: z.coerce
    .number({ error: 'El precio del dólar debe ser un número' })
    .positive('El precio del dólar debe ser mayor que 0')
    .max(100_000, 'El precio del dólar es demasiado alto')
    .optional(),
  /** Comprobante del gasto (data URL); "" lo borra. */
  image: imageDataUrlSchema.optional(),
  /** "YYYY-MM-DD"; optional, defaults to null (sin fecha). */
  date: dateOnlySchema.optional(),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

/** Route params for /api/projects/:projectId/expenses/:expenseId */
export const expenseParamsSchema = z.object({
  projectId: z
    .string({ error: 'El identificador del proyecto no es válido' })
    .trim()
    .min(1, 'El identificador del proyecto no es válido'),
  expenseId: z
    .string({ error: 'El identificador del gasto no es válido' })
    .trim()
    .min(1, 'El identificador del gasto no es válido')
    .optional(),
});
