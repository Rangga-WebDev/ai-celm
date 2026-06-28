-- CreateEnum
CREATE TYPE "GradeSource" AS ENUM ('QUIZ', 'CER', 'PROJECT', 'PARTICIPATION', 'MANUAL');

-- CreateEnum
CREATE TYPE "LetterGrade" AS ENUM ('A', 'AB', 'B', 'BC', 'C', 'D', 'E');

-- CreateTable
CREATE TABLE "GradeComponent" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" "GradeSource" NOT NULL DEFAULT 'MANUAL',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentScore" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGrade" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "numericScore" DOUBLE PRECISION,
    "letterGrade" "LetterGrade",
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeComponent_courseId_idx" ON "GradeComponent"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeComponent_courseId_order_key" ON "GradeComponent"("courseId", "order");

-- CreateIndex
CREATE INDEX "ComponentScore_componentId_idx" ON "ComponentScore"("componentId");

-- CreateIndex
CREATE INDEX "ComponentScore_studentId_idx" ON "ComponentScore"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentScore_componentId_studentId_key" ON "ComponentScore"("componentId", "studentId");

-- CreateIndex
CREATE INDEX "CourseGrade_courseId_idx" ON "CourseGrade"("courseId");

-- CreateIndex
CREATE INDEX "CourseGrade_studentId_idx" ON "CourseGrade"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseGrade_courseId_studentId_key" ON "CourseGrade"("courseId", "studentId");

-- AddForeignKey
ALTER TABLE "GradeComponent" ADD CONSTRAINT "GradeComponent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentScore" ADD CONSTRAINT "ComponentScore_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "GradeComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentScore" ADD CONSTRAINT "ComponentScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentScore" ADD CONSTRAINT "ComponentScore_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGrade" ADD CONSTRAINT "CourseGrade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGrade" ADD CONSTRAINT "CourseGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
