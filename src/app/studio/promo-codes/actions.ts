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
