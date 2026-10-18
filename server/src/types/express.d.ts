import type { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado; lo asigna el middleware `requireAuth`. */
      user?: User;
    }
  }
}

export {};
