-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "regionId" TEXT,
ADD COLUMN     "sourceHash" TEXT,
ADD COLUMN     "sourceRef" TEXT;

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "sourceHash" TEXT,
ADD COLUMN     "sourceRef" TEXT;

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "control" JSONB,
ADD COLUMN     "controlAsOf" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Article_worldId_sourceRef_key" ON "Article"("worldId", "sourceRef");

-- CreateIndex
CREATE UNIQUE INDEX "Character_worldId_sourceRef_key" ON "Character"("worldId", "sourceRef");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

