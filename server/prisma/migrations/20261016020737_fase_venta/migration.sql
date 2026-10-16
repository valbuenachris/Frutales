-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "buyerContact" TEXT,
ADD COLUMN     "buyerName" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "paymentType" TEXT,
ADD COLUMN     "scheduledPaymentDate" TIMESTAMP(3),
ADD COLUMN     "transactionDate" TIMESTAMP(3),
ALTER COLUMN "sellingPrice" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "projects_paymentStatus_idx" ON "projects"("paymentStatus");
