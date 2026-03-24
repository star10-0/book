-- Add idempotency guard for grant issuance per order item.
CREATE UNIQUE INDEX "AccessGrant_userId_orderItemId_type_key"
ON "AccessGrant"("userId", "orderItemId", "type");
