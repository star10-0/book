-- Create enums
CREATE TYPE "PromoCodeType" AS ENUM ('FREE', 'PERCENT', 'FIXED');
CREATE TYPE "PromoCodeAudience" AS ENUM ('PUBLIC', 'INSTITUTION', 'CREATOR');
CREATE TYPE "PromoCodeAppliesTo" AS ENUM ('ANY', 'PURCHASE', 'RENTAL', 'PUBLISHING_FEE');
CREATE TYPE "PromoRedemptionStatus" AS ENUM ('APPLIED', 'REDEEMED', 'VOIDED');

-- Create organization model
CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- User relation to organization
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- Promo code model
CREATE TABLE "PromoCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "internalLabel" TEXT,
  "notes" TEXT,
  "type" "PromoCodeType" NOT NULL,
  "value" INTEGER,
  "currency" "CurrencyCode",
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "maxTotalUses" INTEGER,
  "maxUsesPerUser" INTEGER,
  "minimumAmountCents" INTEGER,
  "audience" "PromoCodeAudience" NOT NULL DEFAULT 'PUBLIC',
  "appliesTo" "PromoCodeAppliesTo" NOT NULL DEFAULT 'ANY',
  "organizationId" TEXT,
  "creatorId" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "PromoCode_code_isActive_idx" ON "PromoCode"("code", "isActive");
CREATE INDEX "PromoCode_organizationId_idx" ON "PromoCode"("organizationId");
CREATE INDEX "PromoCode_creatorId_idx" ON "PromoCode"("creatorId");
CREATE INDEX "PromoCode_audience_appliesTo_idx" ON "PromoCode"("audience", "appliesTo");

-- Order promo fields
ALTER TABLE "Order" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "promoCodeId" TEXT;
CREATE INDEX "Order_promoCodeId_idx" ON "Order"("promoCodeId");

-- Redemption model
CREATE TABLE "PromoRedemption" (
  "id" TEXT NOT NULL,
  "promoCodeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "paymentId" TEXT,
  "discountCents" INTEGER NOT NULL,
  "originalTotalCents" INTEGER NOT NULL,
  "finalTotalCents" INTEGER NOT NULL,
  "status" "PromoRedemptionStatus" NOT NULL DEFAULT 'APPLIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoRedemption_promoCodeId_userId_orderId_key" ON "PromoRedemption"("promoCodeId", "userId", "orderId");
CREATE INDEX "PromoRedemption_promoCodeId_status_idx" ON "PromoRedemption"("promoCodeId", "status");
CREATE INDEX "PromoRedemption_userId_status_idx" ON "PromoRedemption"("userId", "status");
CREATE INDEX "PromoRedemption_orderId_idx" ON "PromoRedemption"("orderId");
CREATE INDEX "PromoRedemption_paymentId_idx" ON "PromoRedemption"("paymentId");

-- Foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
