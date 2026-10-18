import { z } from 'zod';

/** DTO de inicio de sesión. Mensajes visibles para el usuario (es-CO). */
export const loginSchema = z.object({
  email: z
    .string({ error: 'El correo electrónico es obligatorio' })
    .trim()
    .toLowerCase()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria')
    .max(200, 'La contraseña no es válida'),
});

export type LoginInput = z.infer<typeof loginSchema>;
