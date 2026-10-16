import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment configuration, validated at boot.
 * The process fails fast with a clear message when a variable is missing.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);
