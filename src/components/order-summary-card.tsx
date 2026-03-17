"use client";

import { useMemo, useState } from "react";
import type { BookOffer, OfferType } from "@prisma/client";
import { formatArabicCurrency } from "@/lib/formatters/intl";

type CheckoutOffer = Pick<BookOffer, "id" | "type" | "priceCents" | "currency" | "rentalDays">;

type OrderSummaryCardProps = {
  bookId: string;
  bookTitle: string;
  offers: CheckoutOffer[];
};

type ApiSuccess = {
  message: string;
  order: {
    id: string;
  };
};

const offerLabelByType: Record<OfferType, string> = {
  PURCHASE: "شراء رقمي",
  RENTAL: "استئجار رقمي",
};

export function OrderSummaryCard({ bookId, bookTitle, offers }: OrderSummaryCardProps) {
  const [selectedOfferId, setSelectedOfferId] = useState<string>(offers[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const selectedOffer = useMemo(() => offers.find((offer) => offer.id === selectedOfferId) ?? null, [offers, selectedOfferId]);

  async function handleCreateOrder() {
    if (!selectedOfferId) {
      setError("يرجى اختيار عرض قبل إنشاء الطلب.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          offerId: selectedOfferId,
        }),
      });

      const payload = (await response.json()) as ApiSuccess | { message?: string };

      if (!response.ok || !("order" in payload)) {
        setError(payload.message ?? "تعذر إنشاء الطلب. حاول مجددًا.");
        return;
      }

      setSuccessOrderId(payload.order.id);
    } catch {
      setError("حدث خطأ غير متوقع أثناء إنشاء الطلب.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (offers.length === 0) {
    return null;
  }

  if (successOrderId) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" aria-live="polite">
        <h2 className="text-lg font-bold text-emerald-800">تم إنشاء طلبك بنجاح</h2>
        <p className="mt-2 text-sm text-emerald-700">
          رقم الطلب: <span className="font-semibold">{successOrderId}</span>
        </p>
        <p className="mt-1 text-sm text-emerald-700">
          تم حفظ الطلب بالحالة المعلقة بانتظار ربط بوابة الدفع الفعلية.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="ملخص الطلب" className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <h2 className="text-lg font-bold text-slate-900">ملخص الطلب</h2>

      <div className="space-y-2">
        <label htmlFor="offer" className="block text-sm font-semibold text-slate-800">
          اختر العرض
        </label>
        <select
          id="offer"
          value={selectedOfferId}
          onChange={(event) => setSelectedOfferId(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {offers.map((offer) => (
            <option key={offer.id} value={offer.id}>
              {offerLabelByType[offer.type]}
              {offer.type === "RENTAL" && offer.rentalDays ? ` (${offer.rentalDays} يوم)` : ""}
              {` - ${formatPrice(offer.priceCents, offer.currency)}`}
            </option>
          ))}
        </select>
      </div>

      <dl className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">الكتاب</dt>
          <dd className="font-semibold text-slate-900">{bookTitle}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">نوع العرض</dt>
          <dd className="font-semibold text-slate-900">{selectedOffer ? offerLabelByType[selectedOffer.type] : "-"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">الإجمالي</dt>
          <dd className="font-bold text-indigo-700">
            {selectedOffer ? formatPrice(selectedOffer.priceCents, selectedOffer.currency) : "-"}
          </dd>
        </div>
      </dl>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <button
        type="button"
        disabled={isSubmitting || !selectedOffer}
        onClick={handleCreateOrder}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? "جاري إنشاء الطلب..." : "تأكيد الطلب"}
      </button>
    </section>
  );
}

function formatPrice(priceCents: number, currency: string) {
  return formatArabicCurrency(priceCents / 100, { currency });
}
