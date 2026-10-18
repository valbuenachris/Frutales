import type { Request, Response } from 'express';
import { toProjectDto } from './projects.mapper.js';
import { projectIdParamSchema, projectInputSchema } from './projects.schema.js';
import * as projectsService from './projects.service.js';

/**
 * Controllers only translate HTTP <-> service calls.
 * Express 5 automatically forwards rejected promises to the error middleware.
 */

/** GET /api/projects */
export async function list(_req: Request, res: Response): Promise<void> {
  const projects = await projectsService.listProjects();
  res.json({ data: projects.map((project) => toProjectDto(project)) });
}

/** GET /api/projects/:id (includes receipt images) */
export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = projectIdParamSchema.parse(req.params);
  const project = await projectsService.getProject(id);
  res.json({ data: toProjectDto(project, { includeImages: true }) });
}

/** POST /api/projects */
export async function create(req: Request, res: Response): Promise<void> {
  const input = projectInputSchema.parse(req.body);
  const project = await projectsService.createProject(input);
  res.status(201).json({ data: toProjectDto(project, { includeImages: true }) });
}

/** PUT /api/projects/:id */
export async function update(req: Request, res: Response): Promise<void> {
  const { id } = projectIdParamSchema.parse(req.params);
  const input = projectInputSchema.parse(req.body);
  const project = await projectsService.updateProject(id, input);
  res.json({ data: toProjectDto(project, { includeImages: true }) });
}

/** DELETE /api/projects/:id */
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = projectIdParamSchema.parse(req.params);
  await projectsService.deleteProject(id);
  res.status(204).send();
}
