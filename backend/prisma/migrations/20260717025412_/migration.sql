-- DropForeignKey
ALTER TABLE "assets" DROP CONSTRAINT "assets_responsibleUserId_fkey";

-- AlterTable
ALTER TABLE "asset_assignments" ADD COLUMN     "documentPublicId" TEXT,
ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "assets" ALTER COLUMN "responsibleUserId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;
