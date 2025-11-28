-- DropIndex
DROP INDEX "public"."idx_supplier_contactinfo";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "leadTimeDays" INTEGER,
ADD COLUMN     "minStockLevel" INTEGER,
ADD COLUMN     "reorderPoint" INTEGER,
ADD COLUMN     "safetyStockLevel" INTEGER;

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "forecastedQuantity" INTEGER NOT NULL,
    "algorithmUsed" TEXT NOT NULL DEFAULT 'SIMPLE_MOVING_AVERAGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_demandforecast_product" ON "DemandForecast"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DemandForecast_productId_forecastDate_key" ON "DemandForecast"("productId", "forecastDate");

-- CreateIndex
CREATE INDEX "idx_po_supplier" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "idx_po_placed_at" ON "PurchaseOrder"("placedAt");

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
