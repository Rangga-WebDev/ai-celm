-- CreateEnum
CREATE TYPE "ModuleTaskType" AS ENUM ('NONE', 'SMALL', 'BIG');

-- AlterTable
ALTER TABLE "Module" ADD COLUMN "taskType" "ModuleTaskType" NOT NULL DEFAULT 'NONE';
