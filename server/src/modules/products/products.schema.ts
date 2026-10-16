import { z } from 'zod';

/** DTO for the product catalog. Messages are user-facing Spanish. */
export const productInputSchema = z.object({
  name: z
    .string({ error: 'El nombre del producto es obligatorio' })
    .trim()
    .min(1, 'El nombre del producto es obligatorio')
    .max(120, 'El nombre del producto no puede superar los 120 caracteres'),
  description: z
    .string({ error: 'La descripción debe ser texto' })
    .trim()
    .max(255, 'La descripción no puede superar los 255 caracteres')
    .optional(),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const productIdParamSchema = z.object({
  id: z.string({ error: 'El identificador no es válido' }).trim().min(1, 'El identificador no es válido'),
});
