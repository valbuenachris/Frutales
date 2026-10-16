import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

/**
 * Try to reach the database before serving traffic.
 * Retries a few times (useful while PostgreSQL is still booting), then fails
 * with a clear message instead of crashing with an obscure Prisma error.
 */
async function connectToDatabase(attempts = 5, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await prisma.$connect();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Intento ${attempt}/${attempts} de conexión a la base de datos falló: ${message}`);
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function main(): Promise<void> {
  try {
    await connectToDatabase();
  } catch {
    console.error(
      'No se pudo conectar a la base de datos. Verifica DATABASE_URL y que PostgreSQL esté disponible.',
    );
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`API de Frutales escuchando en http://localhost:${env.PORT}`);
  });

  /** Close HTTP server and DB connections cleanly on shutdown. */
  async function shutdown(): Promise<void> {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  }

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void main();
