-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "exchangeRate" DECIMAL(12,4);
