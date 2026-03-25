-- Normalize empty provider references before adding non-empty checks.
UPDATE "Payment"
SET "providerRef" = NULL
WHERE "providerRef" IS NOT NULL AND BTRIM("providerRef") = '';

UPDATE "PaymentAttempt"
SET "providerReference" = NULL
WHERE "providerReference" IS NOT NULL AND BTRIM("providerReference") = '';

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_provider_ref_non_empty_check";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_provider_ref_non_empty_check" CHECK (
  "providerRef" IS NULL OR BTRIM("providerRef") <> ''
);

ALTER TABLE "PaymentAttempt" DROP CONSTRAINT IF EXISTS "PaymentAttempt_provider_reference_non_empty_check";
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_provider_reference_non_empty_check" CHECK (
  "providerReference" IS NULL OR BTRIM("providerReference") <> ''
);
