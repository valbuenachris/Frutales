import { z } from 'zod';

/** DTO for the client catalog. Messages are user-facing Spanish. */
export const clientInputSchema = z.object({
  name: z
    .string({ error: 'El nombre del cliente es obligatorio' })
    .trim()
    .min(1, 'El nombre del cliente es obligatorio')
    .max(120, 'El nombre del cliente no puede superar los 120 caracteres'),
  contact: z
    .string({ error: 'El contacto debe ser texto' })
    .trim()
    .max(60, 'El contacto no puede superar los 60 caracteres')
    .optional(),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

export const clientIdParamSchema = z.object({
  id: z.string({ error: 'El identificador no es válido' }).trim().min(1, 'El identificador no es válido'),
});
