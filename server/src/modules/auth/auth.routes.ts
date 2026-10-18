import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../../middleware/require-auth.js';
import * as controller from './auth.controller.js';

/** Límite de intentos de login por IP para frenar ataques de fuerza bruta. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: { message: 'Demasiados intentos de inicio de sesión. Espera unos minutos.' },
  },
});

/** Rutas públicas/privadas de autenticación. */
export const authRouter = Router();

authRouter.post('/login', loginLimiter, controller.login);
authRouter.post('/logout', controller.logout);
authRouter.get('/me', requireAuth, controller.me);
