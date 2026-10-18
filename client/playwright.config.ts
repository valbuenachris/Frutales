import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E móvil contra los servidores locales de desarrollo (Vite :5173 + API :4000).
 * `npm run test:e2e` levanta ambos si no están corriendo; Postgres debe existir.
 *
 * Credenciales: E2E_EMAIL / E2E_PASSWORD. Si no se pasan, se reutiliza el
 * admin del seed definido en ../server/.env (ADMIN_EMAIL / ADMIN_PASSWORD).
 */
if (!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD) {
  const serverEnv = resolve(import.meta.dirname, '../server/.env');
  if (existsSync(serverEnv)) {
    try {
      process.loadEnvFile(serverEnv);
    } catch {
      // Sin archivo o con formato inválido: el test se salta con un mensaje claro.
    }
    process.env.E2E_EMAIL ??= process.env.ADMIN_EMAIL;
    process.env.E2E_PASSWORD ??= process.env.ADMIN_PASSWORD;
  }
}

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    // En entornos sin navegadores descargados (p. ej. Alpine/musl) se puede
    // apuntar un Chromium del sistema con E2E_CHROMIUM; en local basta
    // `npx playwright install chromium`.
    ...(process.env.E2E_CHROMIUM
      ? { launchOptions: { executablePath: process.env.E2E_CHROMIUM } }
      : {}),
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../server',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
