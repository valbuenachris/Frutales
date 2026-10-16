import type { Process } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../utils/http-error.js';
import type { ProcessInput } from './processes.schema.js';

/** List the catalog alphabetically. */
export const listProcesses = (): Promise<Process[]> =>
  prisma.process.findMany({ orderBy: { name: 'asc' } });

/** Fetch one process or throw a 404. */
export async function getProcess(id: string): Promise<Process> {
  const process = await prisma.process.findUnique({ where: { id } });
  if (!process) throw notFound('Proceso no encontrado');
  return process;
}

export const createProcess = (input: ProcessInput): Promise<Process> =>
  prisma.process.create({ data: { name: input.name } });

export async function updateProcess(id: string, input: ProcessInput): Promise<Process> {
  await getProcess(id); // fail with 404 before hitting update
  return prisma.process.update({ where: { id }, data: { name: input.name } });
}

export async function deleteProcess(id: string): Promise<void> {
  await getProcess(id); // fail with 404 for unknown ids
  await prisma.process.delete({ where: { id } });
}
