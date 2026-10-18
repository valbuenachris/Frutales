import type { Request, Response } from 'express';
import { getAuthUser } from '../../middleware/require-auth.js';
import { toUserDto } from '../users/users.mapper.js';
import { loginSchema } from './auth.schema.js';
import {
  clearSessionCookieOptions,
  createSessionToken,
  login as loginUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from './auth.service.js';

/** POST /api/auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const user = await loginUser(input);
  const token = await createSessionToken(user);

  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
  res.json({ data: toUserDto(user) });
}

/** POST /api/auth/logout */
export function logout(_req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions);
  res.status(204).send();
}

/** GET /api/auth/me */
export function me(req: Request, res: Response): void {
  res.json({ data: toUserDto(getAuthUser(req)) });
}
