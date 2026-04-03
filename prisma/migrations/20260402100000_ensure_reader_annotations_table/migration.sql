DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReaderAnnotationType') THEN
    CREATE TYPE "ReaderAnnotationType" AS ENUM ('DRAWING', 'NOTE', 'BOOKMARK');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ReaderAnnotation" (
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

CREATE INDEX IF NOT EXISTS "ReaderAnnotation_userId_bookId_type_idx" ON "ReaderAnnotation"("userId", "bookId", "type");
CREATE INDEX IF NOT EXISTS "ReaderAnnotation_bookId_locator_idx" ON "ReaderAnnotation"("bookId", "locator");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReaderAnnotation_userId_fkey') THEN
    ALTER TABLE "ReaderAnnotation"
      ADD CONSTRAINT "ReaderAnnotation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReaderAnnotation_bookId_fkey') THEN
    ALTER TABLE "ReaderAnnotation"
      ADD CONSTRAINT "ReaderAnnotation_bookId_fkey"
      FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
