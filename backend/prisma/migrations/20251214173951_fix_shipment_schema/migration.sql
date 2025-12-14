/*
  Warnings:

  - Added the required column `salesOrderId` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `warehouseId` to the `Shipment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "salesOrderId" UUID NOT NULL,
ADD COLUMN     "warehouseId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "idx_shipment_warehouse" ON "Shipment"("warehouseId");

-- CreateIndex
CREATE INDEX "idx_shipment_sales_order" ON "Shipment"("salesOrderId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
