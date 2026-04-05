"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { createAdminAuditLog } from "@/lib/admin/audit-log";
import {
  recoverMissingGrantsForPaidOrder,
  recheckPromoRedemptionLinkage,
  resolveStaleRentalGrants,
} from "@/lib/admin/order-integrity";

function val(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function recoverOrderAccessGrantAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/orders" });
  const orderId = val(formData, "orderId");
  const reason = val(formData, "reason");

  if (!orderId || reason.length < 5) {
    return;
  }

  const result = await recoverMissingGrantsForPaidOrder(orderId);

  await createAdminAuditLog({
    actorAdminId: admin.id,
    action: "PAYMENT_FORCE_GRANT_ACCESS",
    reason,
    orderId,
    metadata: {
      source: "admin/orders",
      integrityRecovery: true,
      ...result,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/users`);
  return;
}

export async function recheckPromoIntegrityAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/orders" });
  const orderId = val(formData, "orderId");
  const reason = val(formData, "reason");
  if (reason.length < 5) {
    return;
  }

  const result = await recheckPromoRedemptionLinkage(orderId || undefined);

  await createAdminAuditLog({
    actorAdminId: admin.id,
    action: "PAYMENT_RECONCILE_BY_TX",
    reason,
    orderId: orderId || null,
    metadata: {
      source: "admin/orders",
      promoIntegrityRecheck: true,
      inspected: result.inspected,
      fixed: result.fixed,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/promo-codes");
  return;
}

export async function resolveStaleRentalGrantsAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/orders" });
  const reason = val(formData, "reason");
  if (reason.length < 5) {
    return;
  }

  const result = await resolveStaleRentalGrants();

  await createAdminAuditLog({
    actorAdminId: admin.id,
    action: "PAYMENT_FORCE_GRANT_ACCESS",
    reason,
    metadata: {
      source: "admin/orders",
      staleRentalResolve: true,
      expired: result.expired,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/users");
  return;
}
