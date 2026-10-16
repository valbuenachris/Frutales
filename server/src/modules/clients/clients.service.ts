import type { Client } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../utils/http-error.js';
import type { ClientInput } from './clients.schema.js';

/** List the catalog alphabetically. */
export const listClients = (): Promise<Client[]> =>
  prisma.client.findMany({ orderBy: { name: 'asc' } });

/** Fetch one client or throw a 404. */
export async function getClient(id: string): Promise<Client> {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw notFound('Cliente no encontrado');
  return client;
}

/** Empty optional strings are stored as NULL. */
const normalize = (input: ClientInput) => ({
  name: input.name,
  contact: input.contact ? input.contact : null,
});

export const createClient = (input: ClientInput): Promise<Client> =>
  prisma.client.create({ data: normalize(input) });

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  await getClient(id); // fail with 404 before hitting update
  return prisma.client.update({ where: { id }, data: normalize(input) });
}

export async function deleteClient(id: string): Promise<void> {
  await getClient(id); // fail with 404 for unknown ids
  await prisma.client.delete({ where: { id } });
}
