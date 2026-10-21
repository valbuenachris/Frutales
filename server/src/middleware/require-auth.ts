import type { NextFunction, Request, Response } from 'express';
import type { User, UserRole } from '@prisma/client';
import { HttpError } from '../utils/http-error.js';
import { authenticateToken, SESSION_COOKIE } from '../modules/auth/auth.service.js';

/** Exige una sesión válida y adjunta el usuario a `req.user`. */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;

  if (!token) {
    next(new HttpError(401, 'Debes iniciar sesión para continuar'));
    return;
  }

  try {
    req.user = await authenticateToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Exige un rol concreto (siempre después de `requireAuth`).
 * Requiere que el usuario tenga un rol específico. Debe ejecutarse después de `requireAuth`.
 * Responde con 401 si no hay usuario autenticado y con 403 si el rol no coincide.
 */
export function requireRole(role: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, 'Debes iniciar sesión para continuar'));
      return;
    }
    if (req.user.role !== role) {
      next(new HttpError(403, 'No tienes permisos para realizar esta acción'));
      return;
    }
    next();
  };
}

/** Usuario autenticado garantizado por `requireAuth`. */
export function getAuthUser(req: Request): User {
  if (!req.user) throw new HttpError(401, 'Debes iniciar sesión para continuar');
  return req.user;
}
