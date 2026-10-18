import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment configuration, validated at boot.
 * The process fails fast with a clear message when a variable is missing.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  /**
   * Secret used to sign session JWTs. Must be at least 32 characters.
   * Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  /** Initial admin created by `npm run db:seed` (optional). */
  ADMIN_NAME: z.string().min(1).default('Administrador'),
  ADMIN_EMAIL: z.string().trim().toLowerCase().email('ADMIN_EMAIL debe ser un correo válido').optional(),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD debe tener al menos 8 caracteres').optional(),
  /**
   * Optional custom provider for the USD -> COP exchange rate.
   * Must return either [{ valor: "3174.67" }] (datos.gov.co shape) or
   * { rates: { COP: 3182.77 } } (open.er-api shape). When unset, the official
   * Colombian TRM (datos.gov.co) is tried first, then open.er-api.com.
   */
  EXCHANGE_RATE_API_URL: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
