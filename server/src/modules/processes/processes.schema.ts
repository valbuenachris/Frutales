import { z } from 'zod';

/** DTO for the process catalog. Messages are user-facing Spanish. */
export const processInputSchema = z.object({
  name: z
    .string({ error: 'El nombre del proceso es obligatorio' })
    .trim()
    .min(1, 'El nombre del proceso es obligatorio')
    .max(60, 'El nombre del proceso no puede superar los 60 caracteres'),
});

export type ProcessInput = z.infer<typeof processInputSchema>;

export const processIdParamSchema = z.object({
  id: z.string({ error: 'El identificador no es válido' }).trim().min(1, 'El identificador no es válido'),
});
