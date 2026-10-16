import type { Request, Response } from 'express';
import { processIdParamSchema, processInputSchema } from './processes.schema.js';
import * as processesService from './processes.service.js';

/** Controllers only translate HTTP <-> service calls. */

/** GET /api/processes */
export async function list(_req: Request, res: Response): Promise<void> {
  const processes = await processesService.listProcesses();
  res.json({ data: processes });
}

/** GET /api/processes/:id */
export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = processIdParamSchema.parse(req.params);
  const process = await processesService.getProcess(id);
  res.json({ data: process });
}

/** POST /api/processes */
export async function create(req: Request, res: Response): Promise<void> {
  const input = processInputSchema.parse(req.body);
  const process = await processesService.createProcess(input);
  res.status(201).json({ data: process });
}

/** PUT /api/processes/:id */
export async function update(req: Request, res: Response): Promise<void> {
  const { id } = processIdParamSchema.parse(req.params);
  const input = processInputSchema.parse(req.body);
  const process = await processesService.updateProcess(id, input);
  res.json({ data: process });
}

/** DELETE /api/processes/:id */
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = processIdParamSchema.parse(req.params);
  await processesService.deleteProcess(id);
  res.status(204).send();
}
