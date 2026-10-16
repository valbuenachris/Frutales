import { Router } from 'express';
import * as controller from './projects.controller.js';

/** REST routes for /api/projects */
export const projectsRouter = Router();

projectsRouter.get('/', controller.list);
projectsRouter.post('/', controller.create);
projectsRouter.get('/:id', controller.getById);
projectsRouter.put('/:id', controller.update);
projectsRouter.delete('/:id', controller.remove);
