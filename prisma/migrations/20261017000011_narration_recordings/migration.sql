-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "narrationId" TEXT;

-- AlterTable
ALTER TABLE "Narrative" ADD COLUMN     "narrationId" TEXT;

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recording_key_key" ON "Recording"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Article_narrationId_key" ON "Article"("narrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Narrative_narrationId_key" ON "Narrative"("narrationId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_narrationId_fkey" FOREIGN KEY ("narrationId") REFERENCES "Recording"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Narrative" ADD CONSTRAINT "Narrative_narrationId_fkey" FOREIGN KEY ("narrationId") REFERENCES "Recording"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Like every table: closed to Supabase's Data API roles (see 20261017000010).
ALTER TABLE "Recording" ENABLE ROW LEVEL SECURITY;
