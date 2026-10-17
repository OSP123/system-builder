-- AlterTable
ALTER TABLE "Narrative" ADD COLUMN     "regionId" TEXT,
ADD COLUMN     "sourceHash" TEXT,
ADD COLUMN     "sourceRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Narrative_worldId_sourceRef_key" ON "Narrative"("worldId", "sourceRef");

-- AddForeignKey
ALTER TABLE "Narrative" ADD CONSTRAINT "Narrative_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

