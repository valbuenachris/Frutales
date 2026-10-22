-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "processType" DROP NOT NULL;

-- Data migration: el tipo de proceso queda eliminado de la aplicación
-- (aprobado por el usuario: se vacía el histórico).
UPDATE "projects" SET "processType" = NULL;
