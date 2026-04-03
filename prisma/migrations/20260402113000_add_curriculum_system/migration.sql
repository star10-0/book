-- CreateTable
CREATE TABLE "CurriculumLevel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumLevelBook" (
    "id" TEXT NOT NULL,
    "curriculumLevelId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "addedByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumLevelBook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumLevel_slug_key" ON "CurriculumLevel"("slug");

-- CreateIndex
CREATE INDEX "CurriculumLevel_isActive_sortOrder_idx" ON "CurriculumLevel"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "CurriculumLevel_sortOrder_idx" ON "CurriculumLevel"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumLevelBook_curriculumLevelId_bookId_key" ON "CurriculumLevelBook"("curriculumLevelId", "bookId");

-- CreateIndex
CREATE INDEX "CurriculumLevelBook_curriculumLevelId_sortOrder_idx" ON "CurriculumLevelBook"("curriculumLevelId", "sortOrder");

-- CreateIndex
CREATE INDEX "CurriculumLevelBook_bookId_idx" ON "CurriculumLevelBook"("bookId");

-- CreateIndex
CREATE INDEX "CurriculumLevelBook_addedByAdminId_idx" ON "CurriculumLevelBook"("addedByAdminId");

-- CreateIndex
CREATE INDEX "CurriculumLevelBook_sortOrder_idx" ON "CurriculumLevelBook"("sortOrder");

-- AddForeignKey
ALTER TABLE "CurriculumLevelBook" ADD CONSTRAINT "CurriculumLevelBook_curriculumLevelId_fkey" FOREIGN KEY ("curriculumLevelId") REFERENCES "CurriculumLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumLevelBook" ADD CONSTRAINT "CurriculumLevelBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumLevelBook" ADD CONSTRAINT "CurriculumLevelBook_addedByAdminId_fkey" FOREIGN KEY ("addedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
