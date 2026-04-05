-- SAFETY NOTE:
-- We intentionally avoid destructive auto-cleanup of duplicate offers during migration.
-- If duplicates exist, we fail with a clear error so operators can reconcile data explicitly.
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT "bookId", "type"
    FROM "BookOffer"
    GROUP BY "bookId", "type"
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: found % duplicate BookOffer (bookId,type) groups. Resolve duplicates manually before applying uniqueness.',
      duplicate_count;
  END IF;
END
$$;

-- Add duplicate-prevention uniqueness for canonical purchase/rental offers per book.
DROP INDEX IF EXISTS "BookOffer_bookId_type_key";
CREATE UNIQUE INDEX "BookOffer_bookId_type_key" ON "BookOffer"("bookId", "type");
