-- CreateEnum
CREATE TYPE "CivicTestType" AS ENUM ('PRE', 'POST');

-- CreateTable
CREATE TABLE "CivicEngagementResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "type" "CivicTestType" NOT NULL,
    "answers" JSONB NOT NULL,
    "scoreCognitive" DOUBLE PRECISION NOT NULL,
    "scoreAffective" DOUBLE PRECISION NOT NULL,
    "scoreBehavioral" DOUBLE PRECISION NOT NULL,
    "scoreOverall" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CivicEngagementResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CivicEngagementResponse_courseId_idx" ON "CivicEngagementResponse"("courseId");

-- CreateIndex
CREATE INDEX "CivicEngagementResponse_userId_idx" ON "CivicEngagementResponse"("userId");

-- CreateIndex
CREATE INDEX "CivicEngagementResponse_type_idx" ON "CivicEngagementResponse"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CivicEngagementResponse_userId_courseId_type_key" ON "CivicEngagementResponse"("userId", "courseId", "type");

-- AddForeignKey
ALTER TABLE "CivicEngagementResponse" ADD CONSTRAINT "CivicEngagementResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicEngagementResponse" ADD CONSTRAINT "CivicEngagementResponse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
