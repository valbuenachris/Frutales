import type { Prisma, User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/http-error.js';
import { hashPassword } from '../auth/auth.service.js';
import type { UserCreateInput, UserUpdateInput } from './users.schema.js';
import { toUserDto, type UserDto } from './users.mapper.js';

/** Lista los usuarios ordenados por nombre. */
export const listUsers = async (): Promise<UserDto[]> => {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  return users.map(toUserDto);
};

/** Busca un usuario o lanza 404. */
export async function getUser(id: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound('Usuario no encontrado');
  return user;
}

export async function createUser(input: UserCreateInput): Promise<UserDto> {
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      active: input.active,
    },
  });
  return toUserDto(user);
}

/** Evita que el sistema quede sin administradores activos. */
async function assertAnotherActiveAdmin(target: User): Promise<void> {
  if (target.role !== 'admin' || !target.active) return;

  const others = await prisma.user.count({
    where: { role: 'admin', active: true, id: { not: target.id } },
  });
  if (others === 0) {
    throw badRequest('Debe existir al menos un administrador activo');
  }
}

export async function updateUser(
  id: string,
  input: UserUpdateInput,
  actorId: string,
): Promise<UserDto> {
  const target = await getUser(id);

  if (target.id === actorId && input.active === false) {
    throw badRequest('No puedes desactivar tu propia cuenta');
  }
  if (target.id === actorId && input.role && input.role !== 'admin') {
    throw badRequest('No puedes quitarte el rol de administrador');
  }

  const deactivatesAdmin = input.active === false || (input.role && input.role !== 'admin');
  if (deactivatesAdmin) {
    await assertAnotherActiveAdmin(target);
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email;
  if (input.role !== undefined) data.role = input.role;
  if (input.active !== undefined) data.active = input.active;
  if (input.password !== undefined) data.passwordHash = await hashPassword(input.password);

  const user = await prisma.user.update({ where: { id }, data });
  return toUserDto(user);
}

export async function deleteUser(id: string, actorId: string): Promise<void> {
  if (id === actorId) {
    throw badRequest('No puedes eliminar tu propio usuario');
  }

  const target = await getUser(id);
  await assertAnotherActiveAdmin(target);
  await prisma.user.delete({ where: { id } });
}
