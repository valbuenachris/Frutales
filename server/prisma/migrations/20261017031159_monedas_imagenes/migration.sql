-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "exchangeRate" DECIMAL(12,4),
ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "purchaseCurrency" TEXT,
ADD COLUMN     "purchaseExchangeRate" DECIMAL(12,4),
ADD COLUMN     "purchaseImage" TEXT,
ADD COLUMN     "saleImage" TEXT;
