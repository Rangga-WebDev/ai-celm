-- AlterTable: Quiz deadline + source material link
ALTER TABLE "Quiz" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "sourceMaterialId" TEXT;

-- AlterTable: QuizQuestion essay/short-answer grading references
ALTER TABLE "QuizQuestion" ADD COLUMN     "referenceAnswer" TEXT,
ADD COLUMN     "gradingCriteria" TEXT;

-- AlterTable: QuizAnswer AI grading metadata
ALTER TABLE "QuizAnswer" ADD COLUMN     "aiFeedback" TEXT,
ADD COLUMN     "gradedByAi" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Portfolio
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "headline" TEXT,
    "aiSummary" TEXT,
    "highlights" JSONB,
    "strengths" JSONB,
    "modelName" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_studentId_key" ON "Portfolio"("studentId");

-- CreateIndex
CREATE INDEX "Portfolio_studentId_idx" ON "Portfolio"("studentId");

-- CreateIndex
CREATE INDEX "Quiz_sourceMaterialId_idx" ON "Quiz"("sourceMaterialId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_sourceMaterialId_fkey" FOREIGN KEY ("sourceMaterialId") REFERENCES "CourseMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
