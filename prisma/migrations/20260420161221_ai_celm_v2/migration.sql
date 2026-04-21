/*
  Warnings:

  - The `unlockRule` column on the `Module` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CPLDomain" AS ENUM ('ATTITUDE', 'KNOWLEDGE', 'GENERAL_SKILL', 'SPECIFIC_SKILL');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('LESSON', 'VIDEO', 'QUIZ', 'DISCUSSION', 'REFLECTION', 'ASSIGNMENT', 'PROJECT_STEP', 'REMEDIAL');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('PDF', 'DOC', 'SLIDE', 'VIDEO', 'LINK', 'IMAGE', 'QUIZ', 'TEMPLATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ThreadType" AS ENUM ('GENERAL', 'DELIBERATION', 'QNA', 'REFLECTION');

-- CreateEnum
CREATE TYPE "ThreadStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVISION_REQUIRED', 'GRADED', 'APPROVED');

-- CreateEnum
CREATE TYPE "AIInteractionType" AS ENUM ('CER_FEEDBACK', 'DELIBERATION_PROMPT', 'REMEDIAL_HINT', 'SUMMARY', 'RECOMMENDATION', 'RUBRIC_ASSIST');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('COURSE_VIEW', 'MODULE_VIEW', 'UNIT_VIEW', 'UNIT_START', 'UNIT_COMPLETE', 'QUIZ_ATTEMPT', 'DISCUSSION_THREAD_CREATE', 'DISCUSSION_POST_CREATE', 'PROJECT_VIEW', 'PROJECT_DRAFT_SAVE', 'PROJECT_SUBMIT', 'AI_REQUEST', 'AI_RESPONSE');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "MicroUnit" ADD COLUMN     "masteryThreshold" DOUBLE PRECISION,
ADD COLUMN     "remedialUnitId" TEXT,
ADD COLUMN     "unitType" "UnitType" NOT NULL DEFAULT 'LESSON',
ADD COLUMN     "unlockRule" JSONB;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "masteryThreshold" DOUBLE PRECISION NOT NULL DEFAULT 75,
DROP COLUMN "unlockRule",
ADD COLUMN     "unlockRule" JSONB;

-- AlterTable
ALTER TABLE "ModuleProgress" ADD COLUMN     "isPassed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remedialRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UnitProgress" ADD COLUMN     "isPassed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remedialRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CPL" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "domain" "CPLDomain" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CPL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCPL" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "cplId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseCPL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CPMK" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CPMK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CPMKCPL" (
    "id" TEXT NOT NULL,
    "cpmkId" TEXT NOT NULL,
    "cplId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CPMKCPL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCPMK" (
    "id" TEXT NOT NULL,
    "cpmkId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCPMK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RPS" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "semesterLabel" TEXT,
    "academicYear" TEXT,
    "description" TEXT,
    "learningStrategy" TEXT,
    "assessmentPolicy" TEXT,
    "referencesNote" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RPS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroUnitSubCPMK" (
    "id" TEXT NOT NULL,
    "microUnitId" TEXT NOT NULL,
    "subCpmkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MicroUnitSubCPMK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningResource" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "moduleId" TEXT,
    "microUnitId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ResourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionThread" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "microUnitId" TEXT,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT,
    "type" "ThreadType" NOT NULL DEFAULT 'GENERAL',
    "status" "ThreadStatus" NOT NULL DEFAULT 'OPEN',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionPost" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "aiModerationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CivicActionProject" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "brief" TEXT,
    "rubric" JSONB,
    "dueAt" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CivicActionProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSubmission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "artifactUrl" TEXT,
    "artifactJson" JSONB,
    "reflection" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIResponseLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "moduleId" TEXT,
    "microUnitId" TEXT,
    "discussionPostId" TEXT,
    "projectSubmissionId" TEXT,
    "interactionType" "AIInteractionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "modelName" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIResponseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "microUnitId" TEXT,
    "eventType" "AnalyticsEventType" NOT NULL,
    "value" DOUBLE PRECISION,
    "sessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CPL_code_key" ON "CPL"("code");

-- CreateIndex
CREATE INDEX "CourseCPL_courseId_idx" ON "CourseCPL"("courseId");

-- CreateIndex
CREATE INDEX "CourseCPL_cplId_idx" ON "CourseCPL"("cplId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseCPL_courseId_cplId_key" ON "CourseCPL"("courseId", "cplId");

-- CreateIndex
CREATE INDEX "CPMK_courseId_idx" ON "CPMK"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CPMK_courseId_code_key" ON "CPMK"("courseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "CPMK_courseId_order_key" ON "CPMK"("courseId", "order");

-- CreateIndex
CREATE INDEX "CPMKCPL_cpmkId_idx" ON "CPMKCPL"("cpmkId");

-- CreateIndex
CREATE INDEX "CPMKCPL_cplId_idx" ON "CPMKCPL"("cplId");

-- CreateIndex
CREATE UNIQUE INDEX "CPMKCPL_cpmkId_cplId_key" ON "CPMKCPL"("cpmkId", "cplId");

-- CreateIndex
CREATE INDEX "SubCPMK_cpmkId_idx" ON "SubCPMK"("cpmkId");

-- CreateIndex
CREATE UNIQUE INDEX "SubCPMK_cpmkId_code_key" ON "SubCPMK"("cpmkId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "SubCPMK_cpmkId_order_key" ON "SubCPMK"("cpmkId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RPS_courseId_key" ON "RPS"("courseId");

-- CreateIndex
CREATE INDEX "MicroUnitSubCPMK_microUnitId_idx" ON "MicroUnitSubCPMK"("microUnitId");

-- CreateIndex
CREATE INDEX "MicroUnitSubCPMK_subCpmkId_idx" ON "MicroUnitSubCPMK"("subCpmkId");

-- CreateIndex
CREATE UNIQUE INDEX "MicroUnitSubCPMK_microUnitId_subCpmkId_key" ON "MicroUnitSubCPMK"("microUnitId", "subCpmkId");

-- CreateIndex
CREATE INDEX "LearningResource_courseId_idx" ON "LearningResource"("courseId");

-- CreateIndex
CREATE INDEX "LearningResource_moduleId_idx" ON "LearningResource"("moduleId");

-- CreateIndex
CREATE INDEX "LearningResource_microUnitId_idx" ON "LearningResource"("microUnitId");

-- CreateIndex
CREATE INDEX "LearningResource_type_idx" ON "LearningResource"("type");

-- CreateIndex
CREATE INDEX "DiscussionThread_courseId_idx" ON "DiscussionThread"("courseId");

-- CreateIndex
CREATE INDEX "DiscussionThread_microUnitId_idx" ON "DiscussionThread"("microUnitId");

-- CreateIndex
CREATE INDEX "DiscussionThread_authorId_idx" ON "DiscussionThread"("authorId");

-- CreateIndex
CREATE INDEX "DiscussionThread_type_idx" ON "DiscussionThread"("type");

-- CreateIndex
CREATE INDEX "DiscussionThread_status_idx" ON "DiscussionThread"("status");

-- CreateIndex
CREATE INDEX "DiscussionPost_threadId_idx" ON "DiscussionPost"("threadId");

-- CreateIndex
CREATE INDEX "DiscussionPost_authorId_idx" ON "DiscussionPost"("authorId");

-- CreateIndex
CREATE INDEX "DiscussionPost_parentId_idx" ON "DiscussionPost"("parentId");

-- CreateIndex
CREATE INDEX "CivicActionProject_courseId_idx" ON "CivicActionProject"("courseId");

-- CreateIndex
CREATE INDEX "CivicActionProject_createdById_idx" ON "CivicActionProject"("createdById");

-- CreateIndex
CREATE INDEX "CivicActionProject_status_idx" ON "CivicActionProject"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CivicActionProject_courseId_slug_key" ON "CivicActionProject"("courseId", "slug");

-- CreateIndex
CREATE INDEX "ProjectSubmission_projectId_idx" ON "ProjectSubmission"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSubmission_studentId_idx" ON "ProjectSubmission"("studentId");

-- CreateIndex
CREATE INDEX "ProjectSubmission_status_idx" ON "ProjectSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSubmission_projectId_studentId_key" ON "ProjectSubmission"("projectId", "studentId");

-- CreateIndex
CREATE INDEX "AIResponseLog_userId_idx" ON "AIResponseLog"("userId");

-- CreateIndex
CREATE INDEX "AIResponseLog_courseId_idx" ON "AIResponseLog"("courseId");

-- CreateIndex
CREATE INDEX "AIResponseLog_moduleId_idx" ON "AIResponseLog"("moduleId");

-- CreateIndex
CREATE INDEX "AIResponseLog_microUnitId_idx" ON "AIResponseLog"("microUnitId");

-- CreateIndex
CREATE INDEX "AIResponseLog_interactionType_idx" ON "AIResponseLog"("interactionType");

-- CreateIndex
CREATE INDEX "AIResponseLog_createdAt_idx" ON "AIResponseLog"("createdAt");

-- CreateIndex
CREATE INDEX "LearningAnalyticsEvent_userId_idx" ON "LearningAnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX "LearningAnalyticsEvent_courseId_idx" ON "LearningAnalyticsEvent"("courseId");

-- CreateIndex
CREATE INDEX "LearningAnalyticsEvent_moduleId_idx" ON "LearningAnalyticsEvent"("moduleId");

-- CreateIndex
CREATE INDEX "LearningAnalyticsEvent_microUnitId_idx" ON "LearningAnalyticsEvent"("microUnitId");

-- CreateIndex
CREATE INDEX "LearningAnalyticsEvent_eventType_idx" ON "LearningAnalyticsEvent"("eventType");

-- CreateIndex
CREATE INDEX "LearningAnalyticsEvent_createdAt_idx" ON "LearningAnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Course_lecturerId_idx" ON "Course"("lecturerId");

-- CreateIndex
CREATE INDEX "MicroUnit_unitType_idx" ON "MicroUnit"("unitType");

-- AddForeignKey
ALTER TABLE "CourseCPL" ADD CONSTRAINT "CourseCPL_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCPL" ADD CONSTRAINT "CourseCPL_cplId_fkey" FOREIGN KEY ("cplId") REFERENCES "CPL"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CPMK" ADD CONSTRAINT "CPMK_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CPMKCPL" ADD CONSTRAINT "CPMKCPL_cpmkId_fkey" FOREIGN KEY ("cpmkId") REFERENCES "CPMK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CPMKCPL" ADD CONSTRAINT "CPMKCPL_cplId_fkey" FOREIGN KEY ("cplId") REFERENCES "CPL"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCPMK" ADD CONSTRAINT "SubCPMK_cpmkId_fkey" FOREIGN KEY ("cpmkId") REFERENCES "CPMK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPS" ADD CONSTRAINT "RPS_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroUnit" ADD CONSTRAINT "MicroUnit_remedialUnitId_fkey" FOREIGN KEY ("remedialUnitId") REFERENCES "MicroUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroUnitSubCPMK" ADD CONSTRAINT "MicroUnitSubCPMK_microUnitId_fkey" FOREIGN KEY ("microUnitId") REFERENCES "MicroUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroUnitSubCPMK" ADD CONSTRAINT "MicroUnitSubCPMK_subCpmkId_fkey" FOREIGN KEY ("subCpmkId") REFERENCES "SubCPMK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_microUnitId_fkey" FOREIGN KEY ("microUnitId") REFERENCES "MicroUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_microUnitId_fkey" FOREIGN KEY ("microUnitId") REFERENCES "MicroUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DiscussionThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DiscussionPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicActionProject" ADD CONSTRAINT "CivicActionProject_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicActionProject" ADD CONSTRAINT "CivicActionProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CivicActionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResponseLog" ADD CONSTRAINT "AIResponseLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResponseLog" ADD CONSTRAINT "AIResponseLog_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResponseLog" ADD CONSTRAINT "AIResponseLog_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResponseLog" ADD CONSTRAINT "AIResponseLog_microUnitId_fkey" FOREIGN KEY ("microUnitId") REFERENCES "MicroUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResponseLog" ADD CONSTRAINT "AIResponseLog_discussionPostId_fkey" FOREIGN KEY ("discussionPostId") REFERENCES "DiscussionPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResponseLog" ADD CONSTRAINT "AIResponseLog_projectSubmissionId_fkey" FOREIGN KEY ("projectSubmissionId") REFERENCES "ProjectSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAnalyticsEvent" ADD CONSTRAINT "LearningAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAnalyticsEvent" ADD CONSTRAINT "LearningAnalyticsEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAnalyticsEvent" ADD CONSTRAINT "LearningAnalyticsEvent_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAnalyticsEvent" ADD CONSTRAINT "LearningAnalyticsEvent_microUnitId_fkey" FOREIGN KEY ("microUnitId") REFERENCES "MicroUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
