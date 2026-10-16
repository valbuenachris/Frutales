-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "processId" TEXT,
ADD COLUMN     "productId" TEXT;

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_name_key" ON "products"("name");

-- CreateIndex
CREATE UNIQUE INDEX "processes_name_key" ON "processes"("name");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill (data migration): seed the new catalogs from the existing free-text
-- values and link the projects. Idempotent: re-running is a no-op.
-- ---------------------------------------------------------------------------

-- Products from distinct non-empty productName values.
INSERT INTO "products" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."productName", now(), now()
FROM (SELECT DISTINCT "productName" FROM "projects" WHERE btrim("productName") <> '') AS p
ON CONFLICT ("name") DO NOTHING;

UPDATE "projects" pr
SET "productId" = pd."id"
FROM "products" pd
WHERE pr."productName" = pd."name" AND pr."productId" IS NULL;

-- Processes from distinct non-empty processType values.
INSERT INTO "processes" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."processType", now(), now()
FROM (SELECT DISTINCT "processType" FROM "projects" WHERE btrim("processType") <> '') AS p
ON CONFLICT ("name") DO NOTHING;

UPDATE "projects" pr
SET "processId" = pc."id"
FROM "processes" pc
WHERE pr."processType" = pc."name" AND pr."processId" IS NULL;

-- Clients from distinct non-empty buyerName values.
INSERT INTO "clients" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."buyerName", now(), now()
FROM (SELECT DISTINCT "buyerName" FROM "projects" WHERE "buyerName" IS NOT NULL AND btrim("buyerName") <> '') AS p;

UPDATE "projects" pr
SET "clientId" = cl."id"
FROM "clients" cl
WHERE pr."buyerName" = cl."name" AND pr."clientId" IS NULL;
