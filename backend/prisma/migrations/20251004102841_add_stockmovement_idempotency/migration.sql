/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `StockMovement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."StockMovement" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_idempotencyKey_key" ON "public"."StockMovement"("idempotencyKey");
