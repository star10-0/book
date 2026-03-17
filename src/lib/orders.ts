import type { OfferType, OrderStatus } from "@prisma/client";

export const orderStatusMeta: Record<OrderStatus, { label: string; tone: string }> = {
  PENDING: { label: "قيد الانتظار", tone: "bg-amber-100 text-amber-800" },
  PAID: { label: "مدفوع", tone: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "ملغي", tone: "bg-rose-100 text-rose-800" },
  REFUNDED: { label: "مسترد", tone: "bg-slate-200 text-slate-700" },
};

export const offerTypeLabel: Record<OfferType, string> = {
  PURCHASE: "شراء رقمي",
  RENTAL: "استئجار رقمي",
};
