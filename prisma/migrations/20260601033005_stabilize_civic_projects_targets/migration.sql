-- AlterTable
ALTER TABLE "CivicActionProject" ADD COLUMN     "instruction" TEXT,
ADD COLUMN     "microUnitId" TEXT,
ADD COLUMN     "moduleId" TEXT,
ADD COLUMN     "objective" TEXT,
ADD COLUMN     "outputType" TEXT;

-- CreateIndex
CREATE INDEX "CivicActionProject_moduleId_idx" ON "CivicActionProject"("moduleId");

-- CreateIndex
CREATE INDEX "CivicActionProject_microUnitId_idx" ON "CivicActionProject"("microUnitId");

-- CreateIndex
CREATE INDEX "CivicActionProject_dueAt_idx" ON "CivicActionProject"("dueAt");

-- AddForeignKey
ALTER TABLE "CivicActionProject" ADD CONSTRAINT "CivicActionProject_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicActionProject" ADD CONSTRAINT "CivicActionProject_microUnitId_fkey" FOREIGN KEY ("microUnitId") REFERENCES "MicroUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
