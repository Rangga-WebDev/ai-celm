-- AlterEnum
ALTER TYPE "ResourceType" ADD VALUE 'ARTICLE';

-- AlterTable
ALTER TABLE "LearningResource" ALTER COLUMN "url" DROP NOT NULL;
ALTER TABLE "LearningResource" ADD COLUMN "content" TEXT;
ALTER TABLE "LearningResource" ADD COLUMN "aiGenerated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LearningResource" ADD COLUMN "sourceMaterialId" TEXT;
ALTER TABLE "LearningResource" ADD COLUMN "modelName" TEXT;

-- CreateIndex
CREATE INDEX "LearningResource_sourceMaterialId_idx" ON "LearningResource"("sourceMaterialId");

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_sourceMaterialId_fkey" FOREIGN KEY ("sourceMaterialId") REFERENCES "CourseMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
