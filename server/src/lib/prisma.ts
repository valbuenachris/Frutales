import { PrismaClient } from '@prisma/client';

/** Single PrismaClient instance shared across the app (avoids connection exhaustion). */
export const prisma = new PrismaClient();
