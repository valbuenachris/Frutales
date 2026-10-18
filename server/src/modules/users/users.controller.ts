import type { Request, Response } from 'express';
import { getAuthUser } from '../../middleware/require-auth.js';
import { toUserDto } from './users.mapper.js';
import { userIdParamSchema, userCreateSchema, userUpdateSchema } from './users.schema.js';
import * as usersService from './users.service.js';

/** GET /api/users (solo admin) */
export async function list(_req: Request, res: Response): Promise<void> {
  const users = await usersService.listUsers();
  res.json({ data: users });
}

/** GET /api/users/:id (solo admin) */
export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = userIdParamSchema.parse(req.params);
  const user = await usersService.getUser(id);
  res.json({ data: toUserDto(user) });
}

/** POST /api/users (solo admin) */
export async function create(req: Request, res: Response): Promise<void> {
  const input = userCreateSchema.parse(req.body);
  const user = await usersService.createUser(input);
  res.status(201).json({ data: user });
}

/** PUT /api/users/:id (solo admin) */
export async function update(req: Request, res: Response): Promise<void> {
  const { id } = userIdParamSchema.parse(req.params);
  const input = userUpdateSchema.parse(req.body);
  const user = await usersService.updateUser(id, input, getAuthUser(req).id);
  res.json({ data: user });
}

/** DELETE /api/users/:id (solo admin) */
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = userIdParamSchema.parse(req.params);
  await usersService.deleteUser(id, getAuthUser(req).id);
  res.status(204).send();
}
