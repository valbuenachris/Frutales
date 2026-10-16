import { Router } from 'express';
import * as controller from './products.controller.js';

/** REST routes for /api/products (catálogo de productos). */
export const productsRouter = Router();

productsRouter.get('/', controller.list);
productsRouter.post('/', controller.create);
productsRouter.get('/:id', controller.getById);
productsRouter.put('/:id', controller.update);
productsRouter.delete('/:id', controller.remove);
