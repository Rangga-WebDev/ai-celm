-- CreateTable
CREATE TABLE "MaterialStudyKit" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdById" TEXT,
    "summary" TEXT NOT NULL,
    "keyPoints" JSONB NOT NULL,
    "flashcards" JSONB NOT NULL,
    "quiz" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialStudyKit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialStudyKit_materialId_key" ON "MaterialStudyKit"("materialId");

-- CreateIndex
CREATE INDEX "MaterialStudyKit_courseId_idx" ON "MaterialStudyKit"("courseId");

-- CreateIndex
CREATE INDEX "MaterialStudyKit_isPublished_idx" ON "MaterialStudyKit"("isPublished");

-- AddForeignKey
ALTER TABLE "MaterialStudyKit" ADD CONSTRAINT "MaterialStudyKit_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "CourseMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialStudyKit" ADD CONSTRAINT "MaterialStudyKit_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialStudyKit" ADD CONSTRAINT "MaterialStudyKit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
