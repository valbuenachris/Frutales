import type { User } from '@prisma/client';

/** Datos públicos de un usuario (nunca incluye el hash de la contraseña). */
export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const toUserDto = (user: User): UserDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
