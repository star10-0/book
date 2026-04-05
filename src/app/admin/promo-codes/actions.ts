"use server";

import { PromoCodeAppliesTo, PromoCodeAudience, PromoCodeType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { createAdminAuditLog } from "@/lib/admin/audit-log";
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

function parsePromoType(value: FormDataEntryValue | null, fallback: PromoCodeType) {
  const parsed = String(value ?? fallback) as PromoCodeType;
  return Object.values(PromoCodeType).includes(parsed) ? parsed : fallback;
}

function parsePromoAudience(value: FormDataEntryValue | null, fallback: PromoCodeAudience) {
  const parsed = String(value ?? fallback) as PromoCodeAudience;
  return Object.values(PromoCodeAudience).includes(parsed) ? parsed : fallback;
}

function parsePromoAppliesTo(value: FormDataEntryValue | null, fallback: PromoCodeAppliesTo) {
  const parsed = String(value ?? fallback) as PromoCodeAppliesTo;
  return Object.values(PromoCodeAppliesTo).includes(parsed) ? parsed : fallback;
}

export async function createPromoCodeAction(formData: FormData) {
  const user = await requireAdmin({ callbackUrl: "/admin/promo-codes" });

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = parsePromoType(formData.get("type"), PromoCodeType.FREE);
  const audience = parsePromoAudience(formData.get("audience"), PromoCodeAudience.PUBLIC);
  const appliesTo = parsePromoAppliesTo(formData.get("appliesTo"), PromoCodeAppliesTo.ANY);

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
  await createAdminAuditLog({
    actorAdminId: user.id,
    action: "PROMO_CODE_MUTATION",
    reason: `create promo: ${code}`,
    metadata: { operation: "create", code, type, audience, appliesTo },
  });

  revalidatePath("/admin/promo-codes");
  revalidatePath("/checkout");
}

export async function togglePromoCodeAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/promo-codes" });

  const promoCodeId = String(formData.get("promoCodeId") ?? "");
  if (!promoCodeId) return;

  const promo = await prisma.promoCode.findUnique({ where: { id: promoCodeId }, select: { isActive: true } });
  if (!promo) return;

  await prisma.promoCode.update({
    where: { id: promoCodeId },
    data: { isActive: !promo.isActive },
  });
  await createAdminAuditLog({
    actorAdminId: admin.id,
    action: "PROMO_CODE_MUTATION",
    reason: `toggle promo: ${promoCodeId}`,
    metadata: { operation: "toggle", promoCodeId, nextActive: !promo.isActive },
  });

  revalidatePath("/admin/promo-codes");
}

export async function updatePromoCodeAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/promo-codes" });

  const promoCodeId = String(formData.get("promoCodeId") ?? "").trim();
  if (!promoCodeId) return;

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return;

  const type = parsePromoType(formData.get("type"), PromoCodeType.FREE);
  const audience = parsePromoAudience(formData.get("audience"), PromoCodeAudience.PUBLIC);
  const appliesTo = parsePromoAppliesTo(formData.get("appliesTo"), PromoCodeAppliesTo.ANY);

  await prisma.promoCode.update({
    where: { id: promoCodeId },
    data: {
      code,
      internalLabel: String(formData.get("internalLabel") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      type,
      value: parseOptionalInt(formData.get("value")),
      isActive: String(formData.get("isActive") ?? "") === "on",
      startsAt: parseOptionalDate(formData.get("startsAt")),
      expiresAt: parseOptionalDate(formData.get("expiresAt")),
      maxTotalUses: parseOptionalInt(formData.get("maxTotalUses")),
      maxUsesPerUser: parseOptionalInt(formData.get("maxUsesPerUser")),
      minimumAmountCents: parseOptionalInt(formData.get("minimumAmountCents")),
      currency: (String(formData.get("currency") ?? "") || null) as "SYP" | "USD" | null,
      audience,
      appliesTo,
      organizationId: String(formData.get("organizationId") ?? "") || null,
      creatorId: String(formData.get("creatorId") ?? "") || null,
    },
  });
  await createAdminAuditLog({
    actorAdminId: admin.id,
    action: "PROMO_CODE_MUTATION",
    reason: `update promo: ${promoCodeId}`,
    metadata: { operation: "update", promoCodeId, code, type, audience, appliesTo },
  });

  revalidatePath("/admin/promo-codes");
}
