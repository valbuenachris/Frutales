import type { Request, Response } from 'express';
import { productIdParamSchema, productInputSchema } from './products.schema.js';
import * as productsService from './products.service.js';

/** Controllers only translate HTTP <-> service calls. */

/** GET /api/products */
export async function list(_req: Request, res: Response): Promise<void> {
  const products = await productsService.listProducts();
  res.json({ data: products });
}

/** GET /api/products/:id */
export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = productIdParamSchema.parse(req.params);
  const product = await productsService.getProduct(id);
  res.json({ data: product });
}

/** POST /api/products */
export async function create(req: Request, res: Response): Promise<void> {
  const input = productInputSchema.parse(req.body);
  const product = await productsService.createProduct(input);
  res.status(201).json({ data: product });
}

/** PUT /api/products/:id */
export async function update(req: Request, res: Response): Promise<void> {
  const { id } = productIdParamSchema.parse(req.params);
  const input = productInputSchema.parse(req.body);
  const product = await productsService.updateProduct(id, input);
  res.json({ data: product });
}

/** DELETE /api/products/:id */
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = productIdParamSchema.parse(req.params);
  await productsService.deleteProduct(id);
  res.status(204).send();
}
