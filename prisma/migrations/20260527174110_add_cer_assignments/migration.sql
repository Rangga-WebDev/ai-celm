-- CreateEnum
CREATE TYPE "CerAssignmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CerAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "microUnitId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "claimQuestion" TEXT,
    "evidenceQuestion" TEXT,
    "reasoningQuestion" TEXT,
    "rubric" JSONB,
    "dueAt" TIMESTAMP(3),
    "status" "CerAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CerSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "claim" TEXT,
    "evidence" TEXT,
    "reasoning" TEXT,
    "answerJson" JSONB,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CerSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CerAssignment_courseId_idx" ON "CerAssignment"("courseId");

-- CreateIndex
CREATE INDEX "CerAssignment_moduleId_idx" ON "CerAssignment"("moduleId");

-- CreateIndex
CREATE INDEX "CerAssignment_microUnitId_idx" ON "CerAssignment"("microUnitId");

-- CreateIndex
CREATE INDEX "CerAssignment_createdById_idx" ON "CerAssignment"("createdById");

-- CreateIndex
CREATE INDEX "CerAssignment_status_idx" ON "CerAssignment"("status");

-- CreateIndex
CREATE INDEX "CerAssignment_dueAt_idx" ON "CerAssignment"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "CerAssignment_courseId_slug_key" ON "CerAssignment"("courseId", "slug");

-- CreateIndex
CREATE INDEX "CerSubmission_assignmentId_idx" ON "CerSubmission"("assignmentId");

-- CreateIndex
CREATE INDEX "CerSubmission_studentId_idx" ON "CerSubmission"("studentId");

-- CreateIndex
CREATE INDEX "CerSubmission_status_idx" ON "CerSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CerSubmission_assignmentId_studentId_key" ON "CerSubmission"("assignmentId", "studentId");

-- AddForeignKey
ALTER TABLE "CerAssignment" ADD CONSTRAINT "CerAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerAssignment" ADD CONSTRAINT "CerAssignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerAssignment" ADD CONSTRAINT "CerAssignment_microUnitId_fkey" FOREIGN KEY ("microUnitId") REFERENCES "MicroUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerAssignment" ADD CONSTRAINT "CerAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerSubmission" ADD CONSTRAINT "CerSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "CerAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerSubmission" ADD CONSTRAINT "CerSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
