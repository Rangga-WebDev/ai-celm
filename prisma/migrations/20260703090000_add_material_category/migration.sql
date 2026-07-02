-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('GENERAL', 'CURRICULUM');

-- AlterTable
ALTER TABLE "CourseMaterial" ADD COLUMN "category" "MaterialCategory" NOT NULL DEFAULT 'GENERAL';
