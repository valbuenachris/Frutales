import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/require-auth.js';
import * as controller from './users.controller.js';

/** Administración de usuarios: solo el rol admin. */
export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole('admin'));
usersRouter.get('/', controller.list);
usersRouter.post('/', controller.create);
usersRouter.get('/:id', controller.getById);
usersRouter.put('/:id', controller.update);
usersRouter.delete('/:id', controller.remove);
