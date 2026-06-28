-- CreateEnum
CREATE TYPE "AssignmentExamType" AS ENUM ('NONE', 'UTS', 'UAS');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "examType" "AssignmentExamType" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "Assignment_examType_idx" ON "Assignment"("examType");
