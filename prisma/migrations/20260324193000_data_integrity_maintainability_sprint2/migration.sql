-- Backfill potentially invalid data before adding stricter constraints.
UPDATE "BookReview"
SET "rating" = LEAST(5, GREATEST(1, "rating"))
WHERE "rating" < 1 OR "rating" > 5;

UPDATE "BookOffer"
SET "priceCents" = 0
WHERE "priceCents" < 0;

UPDATE "Order"
SET "subtotalCents" = GREATEST(0, "subtotalCents"),
    "totalCents" = GREATEST(0, "totalCents")
WHERE "subtotalCents" < 0 OR "totalCents" < 0;

UPDATE "OrderItem"
SET "unitPriceCents" = GREATEST(0, "unitPriceCents"),
    "quantity" = GREATEST(1, "quantity")
WHERE "unitPriceCents" < 0 OR "quantity" < 1;

UPDATE "Payment"
SET "amountCents" = 0
WHERE "amountCents" < 0;

UPDATE "PaymentAttempt"
SET "amountCents" = 0
WHERE "amountCents" < 0;

UPDATE "BookOffer"
SET "rentalDays" = NULL
WHERE "type" = 'PURCHASE' AND "rentalDays" IS NOT NULL;

UPDATE "BookOffer"
SET "rentalDays" = LEAST(365, GREATEST(1, COALESCE("rentalDays", 14)))
WHERE "type" = 'RENTAL' AND ("rentalDays" IS NULL OR "rentalDays" < 1 OR "rentalDays" > 365);

UPDATE "OrderItem"
SET "rentalDays" = NULL
WHERE "offerType" = 'PURCHASE' AND "rentalDays" IS NOT NULL;

UPDATE "OrderItem"
SET "rentalDays" = LEAST(365, GREATEST(1, COALESCE("rentalDays", 14)))
WHERE "offerType" = 'RENTAL' AND ("rentalDays" IS NULL OR "rentalDays" < 1 OR "rentalDays" > 365);

UPDATE "ReadingProgress"
SET "progressPercent" = LEAST(100, GREATEST(0, "progressPercent"))
WHERE "progressPercent" < 0 OR "progressPercent" > 100;

-- Remove duplicate provider references so we can safely add uniqueness.
WITH payment_ref_dupes AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "provider", "providerRef"
           ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
         ) AS row_num
  FROM "Payment"
  WHERE "providerRef" IS NOT NULL
)
UPDATE "Payment" AS p
SET "providerRef" = NULL
FROM payment_ref_dupes d
WHERE p."id" = d."id" AND d.row_num > 1;

WITH attempt_ref_dupes AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "provider", "providerReference"
           ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
         ) AS row_num
  FROM "PaymentAttempt"
  WHERE "providerReference" IS NOT NULL
)
UPDATE "PaymentAttempt" AS pa
SET "providerReference" = NULL
FROM attempt_ref_dupes d
WHERE pa."id" = d."id" AND d.row_num > 1;

-- Add low-risk, high-value data integrity constraints.
ALTER TABLE "BookReview" DROP CONSTRAINT IF EXISTS "BookReview_rating_range_check";
ALTER TABLE "BookReview" ADD CONSTRAINT "BookReview_rating_range_check" CHECK ("rating" >= 1 AND "rating" <= 5);

ALTER TABLE "BookOffer" DROP CONSTRAINT IF EXISTS "BookOffer_price_non_negative_check";
ALTER TABLE "BookOffer" ADD CONSTRAINT "BookOffer_price_non_negative_check" CHECK ("priceCents" >= 0);

ALTER TABLE "BookOffer" DROP CONSTRAINT IF EXISTS "BookOffer_rental_days_type_check";
ALTER TABLE "BookOffer" ADD CONSTRAINT "BookOffer_rental_days_type_check" CHECK (
  ("type" = 'PURCHASE' AND "rentalDays" IS NULL)
  OR
  ("type" = 'RENTAL' AND "rentalDays" IS NOT NULL AND "rentalDays" BETWEEN 1 AND 365)
);

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_totals_non_negative_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_totals_non_negative_check" CHECK ("subtotalCents" >= 0 AND "totalCents" >= 0);

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_price_quantity_non_negative_check";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_price_quantity_non_negative_check" CHECK ("unitPriceCents" >= 0 AND "quantity" >= 1);

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_rental_days_type_check";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_rental_days_type_check" CHECK (
  ("offerType" = 'PURCHASE' AND "rentalDays" IS NULL)
  OR
  ("offerType" = 'RENTAL' AND "rentalDays" IS NOT NULL AND "rentalDays" BETWEEN 1 AND 365)
);

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_amount_non_negative_check";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_non_negative_check" CHECK ("amountCents" >= 0);

ALTER TABLE "PaymentAttempt" DROP CONSTRAINT IF EXISTS "PaymentAttempt_amount_non_negative_check";
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_amount_non_negative_check" CHECK ("amountCents" >= 0);

ALTER TABLE "ReadingProgress" DROP CONSTRAINT IF EXISTS "ReadingProgress_progress_percent_range_check";
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_progress_percent_range_check" CHECK ("progressPercent" >= 0 AND "progressPercent" <= 100);

-- Provider reference uniqueness for idempotency and reconciliation.
DROP INDEX IF EXISTS "Payment_provider_providerRef_key";
CREATE UNIQUE INDEX "Payment_provider_providerRef_key"
  ON "Payment"("provider", "providerRef");

DROP INDEX IF EXISTS "PaymentAttempt_provider_providerReference_key";
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerReference_key"
  ON "PaymentAttempt"("provider", "providerReference");
