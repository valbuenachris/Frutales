import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requireAuth } from './middleware/require-auth.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { clientsRouter } from './modules/clients/clients.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { exchangeRateRouter } from './modules/exchange-rate/exchange-rate.routes.js';
import { processesRouter } from './modules/processes/processes.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { projectExpensesRouter } from './modules/projects/expenses.routes.js';
import { projectPaymentsRouter } from './modules/projects/payments.routes.js';
import { projectsRouter } from './modules/projects/projects.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

/** Build the Express application (kept separate from listen() for testability). */
export function createApp(): Express {
  const app = express();

  // One reverse proxy (nginx / Nginx Proxy Manager) sits in front of the API:
  // trust its forwarded headers so rate limiting sees the real client IP.
  app.set('trust proxy', 1);

  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(cookieParser());
  // Receipt images travel as base64 data URLs (compressed client-side).
  app.use(express.json({ limit: '4mb' }));

  /** Root-level health endpoint used by Docker Compose healthchecks. */
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Public auth endpoints + admin-only user management (handled before the
  // global guard so their own middleware controls access).
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);

  // Every other /api route requires an active session.
  app.use('/api', requireAuth);

  app.use('/api/projects/:projectId/expenses', projectExpensesRouter);
  app.use('/api/projects/:projectId/payments', projectPaymentsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/processes', processesRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/exchange-rate', exchangeRateRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { message: 'Ruta no encontrada' } });
  });

  app.use(errorHandler);

  return app;
}
