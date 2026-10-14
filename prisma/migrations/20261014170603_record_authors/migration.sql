-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "authorId" TEXT;

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "authorId" TEXT;

-- AlterTable
ALTER TABLE "Narrative" ADD COLUMN     "authorId" TEXT;

-- AlterTable
ALTER TABLE "Planet" ADD COLUMN     "authorId" TEXT;

-- AlterTable
ALTER TABLE "StarSystem" ADD COLUMN     "authorId" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "authorId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarSystem" ADD CONSTRAINT "StarSystem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planet" ADD CONSTRAINT "Planet_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Narrative" ADD CONSTRAINT "Narrative_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: credit existing records to the owner of their world.
UPDATE "Article" r SET "authorId" = w."ownerId" FROM "World" w WHERE r."worldId" = w."id" AND r."authorId" IS NULL;
UPDATE "StarSystem" r SET "authorId" = w."ownerId" FROM "World" w WHERE r."worldId" = w."id" AND r."authorId" IS NULL;
UPDATE "Character" r SET "authorId" = w."ownerId" FROM "World" w WHERE r."worldId" = w."id" AND r."authorId" IS NULL;
UPDATE "Unit" r SET "authorId" = w."ownerId" FROM "World" w WHERE r."worldId" = w."id" AND r."authorId" IS NULL;
UPDATE "Narrative" r SET "authorId" = w."ownerId" FROM "World" w WHERE r."worldId" = w."id" AND r."authorId" IS NULL;
UPDATE "Planet" p SET "authorId" = w."ownerId"
  FROM "StarSystem" s JOIN "World" w ON s."worldId" = w."id"
  WHERE p."systemId" = s."id" AND p."authorId" IS NULL;
