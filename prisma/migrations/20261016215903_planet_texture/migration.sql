-- AlterTable
ALTER TABLE "Planet" ADD COLUMN     "textureImageId" TEXT;

-- AddForeignKey
ALTER TABLE "Planet" ADD CONSTRAINT "Planet_textureImageId_fkey" FOREIGN KEY ("textureImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
