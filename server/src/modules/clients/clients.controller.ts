import type { Request, Response } from 'express';
import { clientIdParamSchema, clientInputSchema } from './clients.schema.js';
import * as clientsService from './clients.service.js';

/** Controllers only translate HTTP <-> service calls. */

/** GET /api/clients */
export async function list(_req: Request, res: Response): Promise<void> {
  const clients = await clientsService.listClients();
  res.json({ data: clients });
}

/** GET /api/clients/:id */
export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = clientIdParamSchema.parse(req.params);
  const client = await clientsService.getClient(id);
  res.json({ data: client });
}

/** POST /api/clients */
export async function create(req: Request, res: Response): Promise<void> {
  const input = clientInputSchema.parse(req.body);
  const client = await clientsService.createClient(input);
  res.status(201).json({ data: client });
}

/** PUT /api/clients/:id */
export async function update(req: Request, res: Response): Promise<void> {
  const { id } = clientIdParamSchema.parse(req.params);
  const input = clientInputSchema.parse(req.body);
  const client = await clientsService.updateClient(id, input);
  res.json({ data: client });
}

/** DELETE /api/clients/:id */
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = clientIdParamSchema.parse(req.params);
  await clientsService.deleteClient(id);
  res.status(204).send();
}
