-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "InventoryItem_tags_idx" ON "InventoryItem"("tags");
