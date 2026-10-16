import { Router } from 'express';
import * as controller from './dashboard.controller.js';

/** REST routes for /api/dashboard. */
export const dashboardRouter = Router();

dashboardRouter.get('/metrics', controller.getMetrics);
