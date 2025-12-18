-- AlterTable
ALTER TABLE "SalesOrderItem" ADD COLUMN "locationId" UUID;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex (Optional but recommended for performance)
CREATE INDEX "idx_sales_order_item_location" ON "SalesOrderItem"("locationId");
