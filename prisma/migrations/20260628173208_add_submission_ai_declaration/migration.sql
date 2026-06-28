-- AlterTable
ALTER TABLE "AssignmentSubmission" ADD COLUMN     "aiDeclared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiPrompt" TEXT,
ADD COLUMN     "aiUsage" TEXT,
ADD COLUMN     "aiVerification" TEXT,
ADD COLUMN     "honestyPledge" BOOLEAN NOT NULL DEFAULT false;
