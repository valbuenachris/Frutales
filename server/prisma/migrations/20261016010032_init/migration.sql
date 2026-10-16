-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "processType" TEXT NOT NULL,
    "initialQty" DECIMAL(12,3) NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "reductionPct" DECIMAL(5,2) NOT NULL,
    "netYield" DECIMAL(12,3) NOT NULL,
    "netYieldOverridden" BOOLEAN NOT NULL DEFAULT false,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_createdAt_idx" ON "projects"("createdAt");
