/*
  Warnings:

  - You are about to drop the column `aiModerationNote` on the `DiscussionPost` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `DiscussionThread` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `DiscussionThread` table. All the data in the column will be lost.
  - The `status` column on the `DiscussionThread` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[courseId,slug]` on the table `DiscussionThread` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `DiscussionThread` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `DiscussionThread` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiscussionThreadStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DiscussionPostStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'FLAGGED');

-- DropForeignKey
ALTER TABLE "DiscussionPost" DROP CONSTRAINT "DiscussionPost_parentId_fkey";

-- DropForeignKey
ALTER TABLE "DiscussionThread" DROP CONSTRAINT "DiscussionThread_authorId_fkey";

-- DropIndex
DROP INDEX "DiscussionThread_authorId_idx";

-- DropIndex
DROP INDEX "DiscussionThread_type_idx";

-- AlterTable
ALTER TABLE "DiscussionPost" DROP COLUMN "aiModerationNote",
ADD COLUMN     "status" "DiscussionPostStatus" NOT NULL DEFAULT 'VISIBLE';

-- AlterTable
ALTER TABLE "DiscussionThread" DROP COLUMN "authorId",
DROP COLUMN "type",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moduleId" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "DiscussionThreadStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "DiscussionPost_status_idx" ON "DiscussionPost"("status");

-- CreateIndex
CREATE INDEX "DiscussionThread_moduleId_idx" ON "DiscussionThread"("moduleId");

-- CreateIndex
CREATE INDEX "DiscussionThread_createdById_idx" ON "DiscussionThread"("createdById");

-- CreateIndex
CREATE INDEX "DiscussionThread_status_idx" ON "DiscussionThread"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionThread_courseId_slug_key" ON "DiscussionThread"("courseId", "slug");

-- AddForeignKey
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DiscussionPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
