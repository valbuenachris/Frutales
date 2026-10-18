import { z } from 'zod';

const emailSchema = z
  .string({ error: 'El correo electrónico es obligatorio' })
  .trim()
  .toLowerCase()
  .min(1, 'El correo electrónico es obligatorio')
  .email('Ingresa un correo electrónico válido');

const nameSchema = z
  .string({ error: 'El nombre es obligatorio' })
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(120, 'El nombre no puede superar los 120 caracteres');

const passwordSchema = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar los 72 caracteres');

const roleSchema = z.enum(['admin', 'usuario'], { error: 'El rol no es válido' });

/** DTO para crear un usuario (solo administradores). */
export const userCreateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema.default('usuario'),
  active: z.boolean({ error: 'El estado debe ser verdadero o falso' }).default(true),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;

/** DTO para editar un usuario; la contraseña vacía significa "no cambiar". */
export const userUpdateSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: z
    .union([z.literal(''), passwordSchema])
    .optional()
    .transform((value) => (value ? value : undefined)),
  role: roleSchema.optional(),
  active: z.boolean({ error: 'El estado debe ser verdadero o falso' }).optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const userIdParamSchema = z.object({
  id: z
    .string({ error: 'El identificador no es válido' })
    .trim()
    .min(1, 'El identificador no es válido'),
});
