-- CreateEnum
CREATE TYPE "ReaderAnnotationType" AS ENUM ('DRAWING', 'NOTE', 'BOOKMARK');

-- CreateTable
CREATE TABLE "ReaderAnnotation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "type" "ReaderAnnotationType" NOT NULL,
    "locator" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReaderAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReaderAnnotation_userId_bookId_type_idx" ON "ReaderAnnotation"("userId", "bookId", "type");

-- CreateIndex
CREATE INDEX "ReaderAnnotation_bookId_locator_idx" ON "ReaderAnnotation"("bookId", "locator");

-- AddForeignKey
ALTER TABLE "ReaderAnnotation" ADD CONSTRAINT "ReaderAnnotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderAnnotation" ADD CONSTRAINT "ReaderAnnotation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
