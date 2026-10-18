import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

/**
 * Seed idempotente: crea el administrador inicial a partir de las variables
 * ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD. Si el usuario ya existe no se
 * modifica (la contraseña se cambia desde la pantalla de Usuarios).
 *
 * Ejecutar con: npm run db:seed
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador';

  if (!email || !password) {
    console.log(
      'Seed omitido: define ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador inicial.',
    );
    return;
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`El administrador ${email} ya existe; no se modificó.`);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: UserRole.admin,
      active: true,
    },
  });

  console.log(`Administrador ${email} creado correctamente.`);
}

main()
  .catch((error: unknown) => {
    console.error('Error al crear el administrador inicial:', error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
