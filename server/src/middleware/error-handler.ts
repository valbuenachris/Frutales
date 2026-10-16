import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error.js';

/**
 * Central error middleware: logs unexpected failures and returns a
 * consistent JSON envelope: { error: { message, details? } }.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Error de validación',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { message: error.message, details: error.details } });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: { message: 'Recurso no encontrado' } });
      return;
    }
  }

  console.error('[unhandled error]', error);
  res.status(500).json({ error: { message: 'Error interno del servidor' } });
}
