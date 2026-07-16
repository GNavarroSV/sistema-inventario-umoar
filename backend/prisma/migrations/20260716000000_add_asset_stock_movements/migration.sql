-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT');

-- ExtendEnum
ALTER TYPE "AssetHistoryEventType" ADD VALUE IF NOT EXISTS 'STOCK_IN';
ALTER TYPE "AssetHistoryEventType" ADD VALUE IF NOT EXISTS 'STOCK_OUT';

-- CreateTable
CREATE TABLE "asset_stock_movements" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "performedByUserId" INTEGER,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "freeQuantity" INTEGER NOT NULL DEFAULT 0,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "sourceBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_stock_movements_assetId_idx" ON "asset_stock_movements"("assetId");
CREATE INDEX "asset_stock_movements_performedByUserId_idx" ON "asset_stock_movements"("performedByUserId");
CREATE INDEX "asset_stock_movements_type_idx" ON "asset_stock_movements"("type");
CREATE INDEX "asset_stock_movements_createdAt_idx" ON "asset_stock_movements"("createdAt");

-- AddForeignKey
ALTER TABLE "asset_stock_movements"
ADD CONSTRAINT "asset_stock_movements_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "asset_stock_movements"
ADD CONSTRAINT "asset_stock_movements_performedByUserId_fkey"
FOREIGN KEY ("performedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
