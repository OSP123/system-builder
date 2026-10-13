-- AlterTable
ALTER TABLE "StarSystem" ADD COLUMN     "backdropImageId" TEXT,
ADD COLUMN     "theme" JSONB;

-- AddForeignKey
ALTER TABLE "StarSystem" ADD CONSTRAINT "StarSystem_backdropImageId_fkey" FOREIGN KEY ("backdropImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
