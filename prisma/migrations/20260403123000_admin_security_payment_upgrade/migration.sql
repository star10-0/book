-- Enums
CREATE TYPE "AdminAuditAction" AS ENUM (
  'USER_BANNED',
  'USER_UNBANNED',
  'USER_FORCE_LOGOUT_ALL',
  'USER_FORCE_PASSWORD_RESET',
  'TRUSTED_DEVICE_REVOKED',
  'PAYMENT_RETRY_VERIFY',
  'PAYMENT_RECONCILE_BY_TX',
  'PAYMENT_FORCE_GRANT_ACCESS',
  'PAYMENT_TX_LOCK_RELEASED'
);

CREATE TYPE "UserSecurityEventType" AS ENUM (
  'LOGIN_SUCCESS',
  'LOGIN_BLOCKED_UNTRUSTED_DEVICE',
  'TRUSTED_DEVICE_REGISTERED',
  'TRUSTED_DEVICE_REVOKED',
  'POLICY_ACCEPTED',
  'PASSWORD_RESET_REQUIRED',
  'FORCE_LOGOUT_ALL'
);

-- User extensions
ALTER TABLE "User"
  ADD COLUMN "acceptedDevicePolicyAt" TIMESTAMP(3),
  ADD COLUMN "acceptedTermsVersion" TEXT,
  ADD COLUMN "requirePasswordReset" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE INDEX "User_acceptedTermsVersion_idx" ON "User"("acceptedTermsVersion");
CREATE INDEX "User_lastSeenAt_idx" ON "User"("lastSeenAt");

-- Trusted devices
CREATE TABLE "UserTrustedDevice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "label" TEXT,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isTrusted" BOOLEAN NOT NULL DEFAULT true,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserTrustedDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserTrustedDevice_userId_tokenHash_key" ON "UserTrustedDevice"("userId", "tokenHash");
CREATE INDEX "UserTrustedDevice_userId_revokedAt_idx" ON "UserTrustedDevice"("userId", "revokedAt");
CREATE INDEX "UserTrustedDevice_userId_isPrimary_idx" ON "UserTrustedDevice"("userId", "isPrimary");

ALTER TABLE "UserTrustedDevice"
  ADD CONSTRAINT "UserTrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Security events
CREATE TABLE "UserSecurityEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "UserSecurityEventType" NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserSecurityEvent_userId_createdAt_idx" ON "UserSecurityEvent"("userId", "createdAt");
CREATE INDEX "UserSecurityEvent_type_createdAt_idx" ON "UserSecurityEvent"("type", "createdAt");

ALTER TABLE "UserSecurityEvent"
  ADD CONSTRAINT "UserSecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Admin audit logs
CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "actorAdminId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "paymentAttemptId" TEXT,
  "action" "AdminAuditAction" NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_actorAdminId_createdAt_idx" ON "AdminAuditLog"("actorAdminId", "createdAt");
CREATE INDEX "AdminAuditLog_targetUserId_createdAt_idx" ON "AdminAuditLog"("targetUserId", "createdAt");
CREATE INDEX "AdminAuditLog_paymentAttemptId_createdAt_idx" ON "AdminAuditLog"("paymentAttemptId", "createdAt");
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AdminAuditLog_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
