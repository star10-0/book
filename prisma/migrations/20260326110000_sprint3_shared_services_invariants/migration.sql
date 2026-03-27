-- Deduplicate book offers before adding uniqueness by (bookId, type).
WITH ranked_offers AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "bookId", "type"
      ORDER BY "isActive" DESC, "updatedAt" DESC, "createdAt" DESC, id DESC
    ) AS row_num
  FROM "BookOffer"
)
DELETE FROM "BookOffer" bo
USING ranked_offers ro
WHERE bo.id = ro.id
  AND ro.row_num > 1;

-- Add duplicate-prevention uniqueness for canonical purchase/rental offers per book.
DROP INDEX IF EXISTS "BookOffer_bookId_type_key";
CREATE UNIQUE INDEX "BookOffer_bookId_type_key" ON "BookOffer"("bookId", "type");
