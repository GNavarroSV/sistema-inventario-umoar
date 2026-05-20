-- DropForeignKey
ALTER TABLE "assets" DROP CONSTRAINT "assets_responsibleUserId_fkey";

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "documentNumber" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "people_email_key" ON "people"("email");

-- CreateIndex
CREATE UNIQUE INDEX "people_documentNumber_key" ON "people"("documentNumber");

-- CreateIndex
CREATE INDEX "people_isActive_idx" ON "people"("isActive");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
