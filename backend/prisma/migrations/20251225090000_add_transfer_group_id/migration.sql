-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "transferGroupId" UUID;

-- CreateIndex (Optional but recommended for performance)
CREATE INDEX "idx_stockmovement_transfer_group" ON "StockMovement"("transferGroupId");
