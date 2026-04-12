import "server-only";
import {
  BannerFitMode,
  BannerHeightPreset,
  BannerImagePosition,
  BannerOverlayColor,
  BannerPlacement,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export { BannerFitMode, BannerHeightPreset, BannerImagePosition, BannerOverlayColor, BannerPlacement };

export type StorefrontBannerView = {
  id: string;
  name: string;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
  clickUrl: string | null;
  altText: string;
  placement: BannerPlacement;
  sortOrder: number;
  isActive: boolean;
  fitMode: BannerFitMode;
  imagePosition: BannerImagePosition;
  heightDesktop: BannerHeightPreset;
  heightTablet: BannerHeightPreset;
  heightMobile: BannerHeightPreset;
  overlayColor: BannerOverlayColor;
  overlayOpacity: number;
};

export async function getActiveBannersByPlacement(placement: BannerPlacement, limit = 6): Promise<StorefrontBannerView[]> {
  const items = await prisma.storefrontBanner.findMany({
    where: { placement, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
  });

  return items.map((item) => ({
    ...item,
    overlayOpacity: Math.min(90, Math.max(0, item.overlayOpacity)),
  }));
}

const TABLET_HEIGHT_CLASS_MAP: Record<BannerHeightPreset, string> = {
  SHORT: "sm:min-h-[180px]",
  MEDIUM: "sm:min-h-[260px]",
  TALL: "sm:min-h-[320px]",
};

const MOBILE_HEIGHT_CLASS_MAP: Record<BannerHeightPreset, string> = {
  SHORT: "min-h-[160px]",
  MEDIUM: "min-h-[200px]",
  TALL: "min-h-[240px]",
};

const DESKTOP_HEIGHT_CLASS_MAP: Record<BannerHeightPreset, string> = {
  SHORT: "lg:min-h-[240px]",
  MEDIUM: "lg:min-h-[320px]",
  TALL: "lg:min-h-[400px]",
};

const POSITION_CLASS_MAP: Record<BannerImagePosition, string> = {
  CENTER: "object-center",
  TOP: "object-top",
  BOTTOM: "object-bottom",
  LEFT: "object-left",
  RIGHT: "object-right",
};

const FIT_CLASS_MAP: Record<BannerFitMode, string> = {
  COVER: "object-cover",
  CONTAIN: "object-contain",
};

const OVERLAY_RGB_MAP: Record<Exclude<BannerOverlayColor, "NONE">, string> = {
  BLACK: "15 23 42",
  SLATE: "51 65 85",
  INDIGO: "67 56 202",
  EMERALD: "5 150 105",
  AMBER: "217 119 6",
};

export function getBannerHeightClasses(banner: Pick<StorefrontBannerView, "heightDesktop" | "heightTablet" | "heightMobile">) {
  return [
    MOBILE_HEIGHT_CLASS_MAP[banner.heightMobile],
    TABLET_HEIGHT_CLASS_MAP[banner.heightTablet],
    DESKTOP_HEIGHT_CLASS_MAP[banner.heightDesktop],
  ].join(" ");
}

export function getBannerImageClasses(banner: Pick<StorefrontBannerView, "fitMode" | "imagePosition">) {
  return `${FIT_CLASS_MAP[banner.fitMode]} ${POSITION_CLASS_MAP[banner.imagePosition]}`;
}

export function getBannerOverlayStyle(banner: Pick<StorefrontBannerView, "overlayColor" | "overlayOpacity">) {
  if (banner.overlayColor === "NONE" || banner.overlayOpacity <= 0) {
    return null;
  }

  const rgb = OVERLAY_RGB_MAP[banner.overlayColor];
  const opacity = Math.min(90, Math.max(0, banner.overlayOpacity)) / 100;

  return {
    backgroundColor: `rgb(${rgb} / ${opacity})`,
  };
}

export function getHeightPresetLabel(value: BannerHeightPreset) {
  if (value === "SHORT") return "قصير";
  if (value === "MEDIUM") return "متوسط";
  return "مرتفع";
}

export function isSafeBannerUrl(url: string | null) {
  if (!url) return false;

  if (url.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
