-- Supports fast pending-order lookups used by create-order race protections.
CREATE INDEX IF NOT EXISTS "Order_userId_status_updatedAt_idx"
ON "Order"("userId", "status", "updatedAt");
