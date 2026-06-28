-- CreateEnum
CREATE TYPE "ModerationFlag" AS ENUM ('CLEAN', 'CAUTION', 'SEVERE');

-- AlterTable
ALTER TABLE "DiscussionPost" ADD COLUMN     "moderationCategories" TEXT,
ADD COLUMN     "moderationFlag" "ModerationFlag" NOT NULL DEFAULT 'CLEAN',
ADD COLUMN     "moderationNote" TEXT,
ADD COLUMN     "moderationReviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderationRevision" TEXT;

-- CreateIndex
CREATE INDEX "DiscussionPost_moderationFlag_idx" ON "DiscussionPost"("moderationFlag");
