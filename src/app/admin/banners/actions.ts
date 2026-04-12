"use server";

import {
  BannerFitMode,
  BannerHeightPreset,
  BannerImagePosition,
  BannerOverlayColor,
  BannerPlacement,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminScope } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

function parseEnumValue<T extends string>(value: FormDataEntryValue | null, values: readonly T[], fallback: T): T {
  const parsed = String(value ?? fallback) as T;
  return values.includes(parsed) ? parsed : fallback;
}

function parseCheckbox(value: FormDataEntryValue | null) {
  return String(value ?? "") === "on";
}

function parseOptionalUrl(value: FormDataEntryValue | null) {
  const parsed = String(value ?? "").trim();
  if (!parsed) return null;
  if (parsed.startsWith("/")) return parsed;

  try {
    const candidate = new URL(parsed);
    if (candidate.protocol === "https:" || candidate.protocol === "http:") return parsed;
  } catch {
    return null;
  }

  return null;
}

function parseRequiredText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseOverlayOpacity(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(90, Math.max(0, parsed));
}

async function revalidateBannerSurfaces() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
  revalidatePath("/catalog");
}

function parseSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

export async function createBannerAction(formData: FormData) {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/banners" });

  const name = parseRequiredText(formData.get("name"));
  const desktopImageUrl = parseOptionalUrl(formData.get("desktopImageUrl"));
  const altText = parseRequiredText(formData.get("altText"));
  if (!name || !desktopImageUrl || !altText) return;

  await prisma.storefrontBanner.create({
    data: {
      name,
      desktopImageUrl,
      mobileImageUrl: parseOptionalUrl(formData.get("mobileImageUrl")),
      clickUrl: parseOptionalUrl(formData.get("clickUrl")),
      altText,
      isActive: parseCheckbox(formData.get("isActive")),
      sortOrder: parseSortOrder(formData.get("sortOrder")),
      placement: parseEnumValue(formData.get("placement"), Object.values(BannerPlacement), BannerPlacement.HOME_HERO),
      fitMode: parseEnumValue(formData.get("fitMode"), Object.values(BannerFitMode), BannerFitMode.COVER),
      imagePosition: parseEnumValue(formData.get("imagePosition"), Object.values(BannerImagePosition), BannerImagePosition.CENTER),
      heightDesktop: parseEnumValue(formData.get("heightDesktop"), Object.values(BannerHeightPreset), BannerHeightPreset.MEDIUM),
      heightTablet: parseEnumValue(formData.get("heightTablet"), Object.values(BannerHeightPreset), BannerHeightPreset.MEDIUM),
      heightMobile: parseEnumValue(formData.get("heightMobile"), Object.values(BannerHeightPreset), BannerHeightPreset.SHORT),
      overlayColor: parseEnumValue(formData.get("overlayColor"), Object.values(BannerOverlayColor), BannerOverlayColor.NONE),
      overlayOpacity: parseOverlayOpacity(formData.get("overlayOpacity")),
    },
  });

  await revalidateBannerSurfaces();
}

export async function updateBannerAction(formData: FormData) {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/banners" });

  const bannerId = String(formData.get("bannerId") ?? "").trim();
  if (!bannerId) return;

  const name = parseRequiredText(formData.get("name"));
  const desktopImageUrl = parseOptionalUrl(formData.get("desktopImageUrl"));
  const altText = parseRequiredText(formData.get("altText"));
  if (!name || !desktopImageUrl || !altText) return;

  await prisma.storefrontBanner.update({
    where: { id: bannerId },
    data: {
      name,
      desktopImageUrl,
      mobileImageUrl: parseOptionalUrl(formData.get("mobileImageUrl")),
      clickUrl: parseOptionalUrl(formData.get("clickUrl")),
      altText,
      isActive: parseCheckbox(formData.get("isActive")),
      sortOrder: parseSortOrder(formData.get("sortOrder")),
      placement: parseEnumValue(formData.get("placement"), Object.values(BannerPlacement), BannerPlacement.HOME_HERO),
      fitMode: parseEnumValue(formData.get("fitMode"), Object.values(BannerFitMode), BannerFitMode.COVER),
      imagePosition: parseEnumValue(formData.get("imagePosition"), Object.values(BannerImagePosition), BannerImagePosition.CENTER),
      heightDesktop: parseEnumValue(formData.get("heightDesktop"), Object.values(BannerHeightPreset), BannerHeightPreset.MEDIUM),
      heightTablet: parseEnumValue(formData.get("heightTablet"), Object.values(BannerHeightPreset), BannerHeightPreset.MEDIUM),
      heightMobile: parseEnumValue(formData.get("heightMobile"), Object.values(BannerHeightPreset), BannerHeightPreset.SHORT),
      overlayColor: parseEnumValue(formData.get("overlayColor"), Object.values(BannerOverlayColor), BannerOverlayColor.NONE),
      overlayOpacity: parseOverlayOpacity(formData.get("overlayOpacity")),
    },
  });

  await revalidateBannerSurfaces();
}

export async function toggleBannerActiveAction(formData: FormData) {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/banners" });
  const bannerId = String(formData.get("bannerId") ?? "").trim();
  if (!bannerId) return;

  const existing = await prisma.storefrontBanner.findUnique({ where: { id: bannerId }, select: { isActive: true } });
  if (!existing) return;

  await prisma.storefrontBanner.update({ where: { id: bannerId }, data: { isActive: !existing.isActive } });
  await revalidateBannerSurfaces();
}

export async function deleteBannerAction(formData: FormData) {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/banners" });
  const bannerId = String(formData.get("bannerId") ?? "").trim();
  if (!bannerId) return;

  await prisma.storefrontBanner.delete({ where: { id: bannerId } });
  await revalidateBannerSurfaces();
}

export async function moveBannerAction(formData: FormData) {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/banners" });

  const bannerId = String(formData.get("bannerId") ?? "").trim();
  const direction = String(formData.get("direction") ?? "up").trim();
  if (!bannerId || (direction !== "up" && direction !== "down")) return;

  const current = await prisma.storefrontBanner.findUnique({ where: { id: bannerId }, select: { id: true, placement: true, sortOrder: true } });
  if (!current) return;

  const neighbor = await prisma.storefrontBanner.findFirst({
    where:
      direction === "up"
        ? { placement: current.placement, sortOrder: { lt: current.sortOrder } }
        : { placement: current.placement, sortOrder: { gt: current.sortOrder } },
    orderBy: direction === "up" ? [{ sortOrder: "desc" }] : [{ sortOrder: "asc" }],
    select: { id: true, sortOrder: true },
  });

  if (!neighbor) return;

  await prisma.$transaction([
    prisma.storefrontBanner.update({ where: { id: current.id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.storefrontBanner.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  await revalidateBannerSurfaces();
}
