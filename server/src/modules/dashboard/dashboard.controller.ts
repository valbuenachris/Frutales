import type { Request, Response } from 'express';
import * as dashboardService from './dashboard.service.js';

/** GET /api/dashboard/metrics */
export async function getMetrics(_req: Request, res: Response): Promise<void> {
  const metrics = await dashboardService.getDashboardMetrics();
  res.json({ data: metrics });
}
