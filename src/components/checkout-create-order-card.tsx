"use client";

import { OfferType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatArabicCurrency } from "@/lib/formatters/intl";

type CheckoutCreateOrderCardProps = {
  bookId: string;
  bookTitle: string;
  offer: {
    id: string;
    type: OfferType;
    rentalDays: number | null;
    priceCents: number;
    currency: string;
  };
};

type CreateOrderSuccessPayload = {
  order: { id: string };
  checkoutUrl?: string;
};

const offerLabelByType: Record<OfferType, string> = {
  PURCHASE: "شراء رقمي",
  RENTAL: "استئجار رقمي",
};

export function CheckoutCreateOrderCard({ bookId, bookTitle, offer }: CheckoutCreateOrderCardProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateOrder = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId,
          offerId: offer.id,
        }),
      });

      const payload = (await response.json()) as CreateOrderSuccessPayload | { message?: string };

      if (!response.ok || !("order" in payload)) {
        const failureMessage = "message" in payload ? payload.message : undefined;
        setError(failureMessage ?? "تعذر إنشاء الطلب. حاول لاحقاً.");
        return;
      }

      router.push(payload.checkoutUrl ?? `/checkout/${payload.order.id}`);
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم. تحقق من الشبكة ثم أعد المحاولة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-2xl font-bold text-slate-900">إتمام الطلب</h1>
      <p className="mt-2 text-sm text-slate-600">راجع بيانات العرض ثم أنشئ الطلب لمتابعة الدفع.</p>

      <dl className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-600">الكتاب</dt>
          <dd className="font-semibold text-slate-900">{bookTitle}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-600">نوع العرض</dt>
          <dd className="font-semibold text-slate-900">
            {offerLabelByType[offer.type]}
            {offer.type === "RENTAL" && offer.rentalDays ? ` (${offer.rentalDays} يوم)` : ""}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
          <dt className="font-semibold text-slate-700">الإجمالي</dt>
          <dd className="text-base font-bold text-indigo-700">{formatArabicCurrency(offer.priceCents / 100, { currency: offer.currency })}</dd>
        </div>
      </dl>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleCreateOrder}
        disabled={isSubmitting}
        className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? "جاري إنشاء الطلب..." : "تأكيد وإنشاء الطلب"}
      </button>
    </section>
  );
}
