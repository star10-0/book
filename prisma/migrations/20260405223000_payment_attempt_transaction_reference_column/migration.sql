-- Add canonical transaction reference to avoid hot-path JSON extraction lookups.
ALTER TABLE "PaymentAttempt"
ADD COLUMN IF NOT EXISTS "transactionReference" TEXT;

-- Backfill canonical references from legacy request payloads.
UPDATE "PaymentAttempt"
SET "transactionReference" = lower(btrim("requestPayload"->>'transactionReference'))
WHERE "transactionReference" IS NULL
  AND jsonb_typeof("requestPayload") = 'object'
  AND coalesce(btrim("requestPayload"->>'transactionReference'), '') <> '';

-- Optimizes reconciliation and collision checks by canonical tx reference recency.
CREATE INDEX IF NOT EXISTS "PaymentAttempt_transactionReference_createdAt_idx"
ON "PaymentAttempt"("transactionReference", "createdAt" DESC)
WHERE "transactionReference" IS NOT NULL;
