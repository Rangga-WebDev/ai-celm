-- AlterTable: tambahkan konten belajar terstruktur pada Module
ALTER TABLE "Module" ADD COLUMN "learningContent" JSONB;
ALTER TABLE "Module" ADD COLUMN "contentSourceMaterialId" TEXT;
ALTER TABLE "Module" ADD COLUMN "contentGeneratedByAi" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Module" ADD COLUMN "contentUpdatedAt" TIMESTAMP(3);
