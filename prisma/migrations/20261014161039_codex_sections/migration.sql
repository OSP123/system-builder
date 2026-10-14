-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('ACTIVE', 'DECEASED', 'MISSING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ForceSlot" AS ENUM ('HQ', 'ELITES', 'TROOPS', 'FAST_ATTACK', 'HEAVY_SUPPORT', 'TRANSPORT');

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "faction" TEXT,
    "status" "CharacterStatus" NOT NULL DEFAULT 'ACTIVE',
    "quote" TEXT,
    "quoteSource" TEXT,
    "summary" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "profile" JSONB,
    "wargear" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialRules" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "portraitImageId" TEXT,
    "homeworldId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "faction" TEXT,
    "slot" "ForceSlot" NOT NULL DEFAULT 'TROOPS',
    "points" TEXT,
    "squad" TEXT,
    "profiles" JSONB NOT NULL DEFAULT '[]',
    "wargear" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "options" TEXT,
    "specialRules" JSONB,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "imageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Narrative" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "epigraph" TEXT,
    "epigraphSource" TEXT,
    "summary" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "coverImageId" TEXT,
    "planetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Narrative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CharacterToNarrative" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CharacterToNarrative_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Character_worldId_sortOrder_idx" ON "Character"("worldId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Character_worldId_slug_key" ON "Character"("worldId", "slug");

-- CreateIndex
CREATE INDEX "Unit_worldId_slot_sortOrder_idx" ON "Unit"("worldId", "slot", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_worldId_slug_key" ON "Unit"("worldId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Narrative_worldId_slug_key" ON "Narrative"("worldId", "slug");

-- CreateIndex
CREATE INDEX "_CharacterToNarrative_B_index" ON "_CharacterToNarrative"("B");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_portraitImageId_fkey" FOREIGN KEY ("portraitImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_homeworldId_fkey" FOREIGN KEY ("homeworldId") REFERENCES "Planet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Narrative" ADD CONSTRAINT "Narrative_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Narrative" ADD CONSTRAINT "Narrative_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Narrative" ADD CONSTRAINT "Narrative_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToNarrative" ADD CONSTRAINT "_CharacterToNarrative_A_fkey" FOREIGN KEY ("A") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToNarrative" ADD CONSTRAINT "_CharacterToNarrative_B_fkey" FOREIGN KEY ("B") REFERENCES "Narrative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
