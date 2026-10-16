import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { clientsRouter } from './modules/clients/clients.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { processesRouter } from './modules/processes/processes.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { projectsRouter } from './modules/projects/projects.routes.js';

/** Build the Express application (kept separate from listen() for testability). */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json());

  /** Root-level health endpoint used by Docker Compose healthchecks. */
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/projects', projectsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/processes', processesRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { message: 'Ruta no encontrada' } });
  });

  app.use(errorHandler);

  return app;
}
