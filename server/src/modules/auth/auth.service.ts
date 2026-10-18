import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { User } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import type { LoginInput } from './auth.schema.js';

/** Nombre de la cookie de sesión (httpOnly). */
export const SESSION_COOKIE = 'frutales_session';

/** Duración de la cookie; coincide con el vencimiento por defecto del JWT (7d). */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const secret = new TextEncoder().encode(env.JWT_SECRET);

/**
 * Hash de relleno: se compara cuando el correo no existe para que el tiempo de
 * respuesta no revele si una cuenta está registrada.
 */
const DUMMY_PASSWORD_HASH = '$2b$12$07D5xRfjIAfUfIplbd9rperhrqI/lXb/B1Y99QwiGgK806qyknYku';

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 12);

export const verifyPassword = (password: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(password, passwordHash);

/** Opciones de la cookie de sesión (mismas al crearla y al borrarla). */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_MS,
};

export const clearSessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
};

/** Valida credenciales y devuelve el usuario activo. */
export async function login(input: LoginInput): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    await bcrypt.compare(input.password, DUMMY_PASSWORD_HASH);
    throw new HttpError(401, 'Credenciales inválidas');
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, 'Credenciales inválidas');
  }

  if (!user.active) {
    throw new HttpError(403, 'Tu cuenta está desactivada. Contacta a un administrador.');
  }

  return user;
}

/** Firma un JWT de sesión con el id del usuario como sujeto. */
export const createSessionToken = (user: User): Promise<string> =>
  new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);

/**
 * Verifica el JWT y carga el usuario en cada request: así los cambios de rol,
 * la desactivación o la eliminación de la cuenta surten efecto inmediatamente.
 */
export async function authenticateToken(token: string): Promise<User> {
  let userId: string;

  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    if (!payload.sub) throw new Error('Token sin sujeto');
    userId = payload.sub;
  } catch {
    throw new HttpError(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) {
    throw new HttpError(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
  }

  return user;
}
