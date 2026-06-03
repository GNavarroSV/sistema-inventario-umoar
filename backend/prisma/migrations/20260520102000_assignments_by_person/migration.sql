ALTER TABLE "asset_assignments" DROP CONSTRAINT IF EXISTS "asset_assignments_assignedToUserId_fkey";

ALTER TABLE "asset_assignments"
  ADD COLUMN "previousResponsiblePersonId" INTEGER;

ALTER TABLE "asset_assignments"
  ADD CONSTRAINT "asset_assignments_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "asset_assignments"
  ADD CONSTRAINT "asset_assignments_previousResponsiblePersonId_fkey"
  FOREIGN KEY ("previousResponsiblePersonId") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "asset_assignments_previousResponsiblePersonId_idx" ON "asset_assignments"("previousResponsiblePersonId");
