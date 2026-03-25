"use server";

import { PromoCodeAppliesTo, PromoCodeAudience, PromoCodeType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

function parseOptionalInt(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createPromoCodeAction(formData: FormData) {
  const user = await requireAdmin({ callbackUrl: "/admin/promo-codes" });

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "FREE") as PromoCodeType;
  const audience = String(formData.get("audience") ?? "PUBLIC") as PromoCodeAudience;
  const appliesTo = String(formData.get("appliesTo") ?? "ANY") as PromoCodeAppliesTo;

  if (!code) return;

  await prisma.promoCode.create({
    data: {
      code,
      type,
      value: parseOptionalInt(formData.get("value")),
      isActive: String(formData.get("isActive") ?? "on") === "on",
      startsAt: parseOptionalDate(formData.get("startsAt")),
      expiresAt: parseOptionalDate(formData.get("expiresAt")),
      maxTotalUses: parseOptionalInt(formData.get("maxTotalUses")),
      maxUsesPerUser: parseOptionalInt(formData.get("maxUsesPerUser")),
      minimumAmountCents: parseOptionalInt(formData.get("minimumAmountCents")),
      currency: (String(formData.get("currency") ?? "") || null) as "SYP" | "USD" | null,
      appliesTo,
      audience,
      organizationId: String(formData.get("organizationId") ?? "") || null,
      creatorId: String(formData.get("creatorId") ?? "") || null,
      internalLabel: String(formData.get("internalLabel") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      createdByUserId: user.id,
    },
  });

  revalidatePath("/admin/promo-codes");
  revalidatePath("/checkout");
}

export async function togglePromoCodeAction(formData: FormData) {
  await requireAdmin({ callbackUrl: "/admin/promo-codes" });

  const promoCodeId = String(formData.get("promoCodeId") ?? "");
  if (!promoCodeId) return;

  const promo = await prisma.promoCode.findUnique({ where: { id: promoCodeId }, select: { isActive: true } });
  if (!promo) return;

  await prisma.promoCode.update({
    where: { id: promoCodeId },
    data: { isActive: !promo.isActive },
  });

  revalidatePath("/admin/promo-codes");
}
