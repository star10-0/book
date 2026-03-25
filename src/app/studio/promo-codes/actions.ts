"use server";

import { PromoCodeAppliesTo, PromoCodeAudience, PromoCodeType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

function parseOptionalInt(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createCreatorPromoCodeAction(formData: FormData) {
  const user = await requireCreator({ callbackUrl: "/studio/promo-codes" });

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "PERCENT") as PromoCodeType;
  const appliesTo = String(formData.get("appliesTo") ?? "ANY") as PromoCodeAppliesTo;

  if (!code) return;

  await prisma.promoCode.create({
    data: {
      code,
      type,
      value: parseOptionalInt(formData.get("value")),
      audience: PromoCodeAudience.CREATOR,
      appliesTo,
      creatorId: user.id,
      createdByUserId: user.id,
      maxTotalUses: parseOptionalInt(formData.get("maxTotalUses")),
      maxUsesPerUser: parseOptionalInt(formData.get("maxUsesPerUser")),
      minimumAmountCents: parseOptionalInt(formData.get("minimumAmountCents")),
      isActive: true,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });

  revalidatePath("/studio/promo-codes");
}

export async function toggleCreatorPromoCodeAction(formData: FormData) {
  const user = await requireCreator({ callbackUrl: "/studio/promo-codes" });

  const promoCodeId = String(formData.get("promoCodeId") ?? "").trim();
  if (!promoCodeId) return;

  const promo = await prisma.promoCode.findFirst({
    where: { id: promoCodeId, creatorId: user.id },
    select: { id: true, isActive: true },
  });
  if (!promo) return;

  await prisma.promoCode.update({
    where: { id: promo.id },
    data: { isActive: !promo.isActive },
  });

  revalidatePath("/studio/promo-codes");
}

export async function updateCreatorPromoCodeAction(formData: FormData) {
  const user = await requireCreator({ callbackUrl: "/studio/promo-codes" });

  const promoCodeId = String(formData.get("promoCodeId") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "PERCENT") as PromoCodeType;
  const appliesTo = String(formData.get("appliesTo") ?? "ANY") as PromoCodeAppliesTo;
  if (!promoCodeId || !code) return;

  await prisma.promoCode.updateMany({
    where: { id: promoCodeId, creatorId: user.id },
    data: {
      code,
      type: Object.values(PromoCodeType).includes(type) ? type : PromoCodeType.PERCENT,
      appliesTo: Object.values(PromoCodeAppliesTo).includes(appliesTo) ? appliesTo : PromoCodeAppliesTo.ANY,
      value: parseOptionalInt(formData.get("value")),
      maxTotalUses: parseOptionalInt(formData.get("maxTotalUses")),
      maxUsesPerUser: parseOptionalInt(formData.get("maxUsesPerUser")),
      minimumAmountCents: parseOptionalInt(formData.get("minimumAmountCents")),
      notes: String(formData.get("notes") ?? "") || null,
      isActive: String(formData.get("isActive") ?? "") === "on",
      audience: PromoCodeAudience.CREATOR,
      creatorId: user.id,
    },
  });

  revalidatePath("/studio/promo-codes");
}
