import { Router } from 'express';
import * as controller from './exchange-rate.controller.js';

/** REST routes for /api/exchange-rate. */
export const exchangeRateRouter = Router();

exchangeRateRouter.get('/', controller.getRate);
