import { Router } from 'express';
import * as controller from './clients.controller.js';

/** REST routes for /api/clients (catálogo de clientes). */
export const clientsRouter = Router();

clientsRouter.get('/', controller.list);
clientsRouter.post('/', controller.create);
clientsRouter.get('/:id', controller.getById);
clientsRouter.put('/:id', controller.update);
clientsRouter.delete('/:id', controller.remove);
