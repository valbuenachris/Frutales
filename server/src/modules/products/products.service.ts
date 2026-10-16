import type { Product } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../utils/http-error.js';
import type { ProductInput } from './products.schema.js';

/** List the catalog alphabetically. */
export const listProducts = (): Promise<Product[]> =>
  prisma.product.findMany({ orderBy: { name: 'asc' } });

/** Fetch one product or throw a 404. */
export async function getProduct(id: string): Promise<Product> {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw notFound('Producto no encontrado');
  return product;
}

/** Empty optional strings are stored as NULL. */
const normalize = (input: ProductInput) => ({
  name: input.name,
  description: input.description ? input.description : null,
});

export const createProduct = (input: ProductInput): Promise<Product> =>
  prisma.product.create({ data: normalize(input) });

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  await getProduct(id); // fail with 404 before hitting update
  return prisma.product.update({ where: { id }, data: normalize(input) });
}

export async function deleteProduct(id: string): Promise<void> {
  await getProduct(id); // fail with 404 for unknown ids
  await prisma.product.delete({ where: { id } });
}
