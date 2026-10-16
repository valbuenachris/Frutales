import { Router } from 'express';
import * as controller from './processes.controller.js';

/** REST routes for /api/processes (catálogo de procesos). */
export const processesRouter = Router();

processesRouter.get('/', controller.list);
processesRouter.post('/', controller.create);
processesRouter.get('/:id', controller.getById);
processesRouter.put('/:id', controller.update);
processesRouter.delete('/:id', controller.remove);
