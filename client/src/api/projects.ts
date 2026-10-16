import type { Project, ProjectPayload } from '../types/project';
import { apiRequest } from './client';

/** Network layer for the projects resource (kept free of UI concerns). */

export const listProjects = (): Promise<Project[]> => apiRequest<Project[]>('/projects');

export const getProject = (id: string): Promise<Project> => apiRequest<Project>(`/projects/${id}`);

export const createProject = (payload: ProjectPayload): Promise<Project> =>
  apiRequest<Project>('/projects', { method: 'POST', body: JSON.stringify(payload) });

export const updateProject = (id: string, payload: ProjectPayload): Promise<Project> =>
  apiRequest<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteProject = (id: string): Promise<void> =>
  apiRequest<void>(`/projects/${id}`, { method: 'DELETE' });
