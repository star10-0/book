-- CreateEnum
CREATE TYPE "BannerPlacement" AS ENUM ('HOME_HERO', 'CATALOG_HERO', 'SECONDARY');

-- CreateEnum
CREATE TYPE "BannerFitMode" AS ENUM ('COVER', 'CONTAIN');

-- CreateEnum
CREATE TYPE "BannerImagePosition" AS ENUM ('CENTER', 'TOP', 'BOTTOM', 'LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "BannerHeightPreset" AS ENUM ('SHORT', 'MEDIUM', 'TALL');

-- CreateEnum
CREATE TYPE "BannerOverlayColor" AS ENUM ('NONE', 'BLACK', 'SLATE', 'INDIGO', 'EMERALD', 'AMBER');

-- CreateTable
CREATE TABLE "StorefrontBanner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desktopImageUrl" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "clickUrl" TEXT,
    "altText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "placement" "BannerPlacement" NOT NULL DEFAULT 'HOME_HERO',
    "fitMode" "BannerFitMode" NOT NULL DEFAULT 'COVER',
    "imagePosition" "BannerImagePosition" NOT NULL DEFAULT 'CENTER',
    "heightDesktop" "BannerHeightPreset" NOT NULL DEFAULT 'MEDIUM',
    "heightTablet" "BannerHeightPreset" NOT NULL DEFAULT 'MEDIUM',
    "heightMobile" "BannerHeightPreset" NOT NULL DEFAULT 'SHORT',
    "overlayColor" "BannerOverlayColor" NOT NULL DEFAULT 'NONE',
    "overlayOpacity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StorefrontBanner_placement_isActive_sortOrder_idx" ON "StorefrontBanner"("placement", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "StorefrontBanner_isActive_sortOrder_idx" ON "StorefrontBanner"("isActive", "sortOrder");
