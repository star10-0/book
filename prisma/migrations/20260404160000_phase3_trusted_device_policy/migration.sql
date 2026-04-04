-- Phase 3: trusted-device persistence, first-login policy acceptance, and auditable anti-sharing controls

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserSecurityEventType') THEN
    CREATE TYPE "UserSecurityEventType" AS ENUM (
      'LOGIN_SUCCESS',
      'LOGIN_BLOCKED_UNTRUSTED_DEVICE',
      'TRUSTED_DEVICE_REGISTERED',
      'TRUSTED_DEVICE_REVOKED',
      'POLICY_ACCEPTED',
      'PASSWORD_RESET_REQUIRED',
      'FORCE_LOGOUT_ALL'
    );
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "acceptedDevicePolicyAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acceptedTermsVersion" TEXT;

CREATE TABLE IF NOT EXISTS "UserTrustedDevice" (
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

CREATE TABLE IF NOT EXISTS "UserSecurityEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "UserSecurityEventType" NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserTrustedDevice_userId_tokenHash_key" ON "UserTrustedDevice"("userId", "tokenHash");
CREATE INDEX IF NOT EXISTS "UserTrustedDevice_userId_revokedAt_idx" ON "UserTrustedDevice"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "UserTrustedDevice_userId_isPrimary_idx" ON "UserTrustedDevice"("userId", "isPrimary");
CREATE INDEX IF NOT EXISTS "UserSecurityEvent_userId_createdAt_idx" ON "UserSecurityEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserSecurityEvent_type_createdAt_idx" ON "UserSecurityEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "User_acceptedTermsVersion_idx" ON "User"("acceptedTermsVersion");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'UserTrustedDevice_userId_fkey' AND table_name = 'UserTrustedDevice'
  ) THEN
    ALTER TABLE "UserTrustedDevice"
      ADD CONSTRAINT "UserTrustedDevice_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'UserSecurityEvent_userId_fkey' AND table_name = 'UserSecurityEvent'
  ) THEN
    ALTER TABLE "UserSecurityEvent"
      ADD CONSTRAINT "UserSecurityEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
