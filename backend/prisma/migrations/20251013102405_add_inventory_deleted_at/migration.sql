-- AlterEnum
ALTER TYPE "public"."StockMovementType" ADD VALUE 'release';

-- AlterTable
ALTER TABLE "public"."Inventory" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "idx_inventory_deleted_at" ON "public"."Inventory"("deletedAt");
