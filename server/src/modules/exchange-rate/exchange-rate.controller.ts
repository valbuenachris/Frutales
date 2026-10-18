import type { Request, Response } from 'express';
import * as exchangeRateService from './exchange-rate.service.js';

/** GET /api/exchange-rate — current USD -> COP rate (preview for the form). */
export async function getRate(_req: Request, res: Response): Promise<void> {
  const info = await exchangeRateService.getUsdCopRate();
  res.json({ data: info });
}
