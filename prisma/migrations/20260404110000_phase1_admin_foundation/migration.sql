-- Phase 1 admin/security foundation hardening
ALTER TABLE "User"
  ADD COLUMN "bannedReason" TEXT;

ALTER TABLE "AdminAuditLog"
  ADD COLUMN "orderId" TEXT;

CREATE INDEX "AdminAuditLog_orderId_createdAt_idx" ON "AdminAuditLog"("orderId", "createdAt");

ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
