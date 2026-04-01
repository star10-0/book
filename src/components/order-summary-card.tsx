"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BookOffer, OfferType } from "@prisma/client";
import { formatArabicCurrency } from "@/lib/formatters/intl";

type CheckoutOffer = Pick<BookOffer, "id" | "type" | "priceCents" | "currency" | "rentalDays">;

type OrderSummaryCardProps = {
  bookId: string;
  bookTitle: string;
  bookSlug: string;
  isLoggedIn: boolean;
  offers: CheckoutOffer[];
};

const offerLabelByType: Record<OfferType, string> = {
  PURCHASE: "شراء رقمي",
  RENTAL: "استئجار رقمي",
};

export function OrderSummaryCard({ bookId, bookTitle, bookSlug, isLoggedIn, offers }: OrderSummaryCardProps) {
  const [selectedOfferId, setSelectedOfferId] = useState<string>(offers[0]?.id ?? "");

  const selectedOffer = useMemo(() => offers.find((offer) => offer.id === selectedOfferId) ?? null, [offers, selectedOfferId]);
  const purchaseOffer = offers.find((offer) => offer.type === "PURCHASE");
  const rentalOffer = offers.find((offer) => offer.type === "RENTAL");
  const selectedOfferDescription = selectedOffer
    ? selectedOffer.type === "PURCHASE"
      ? "امتلاك دائم ضمن مكتبتك الرقمية"
      : selectedOffer.rentalDays
        ? `وصول كامل لمدة ${selectedOffer.rentalDays} يومًا`
        : "وصول كامل خلال فترة الإيجار"
    : "اختر عرضًا للمتابعة";

  if (offers.length === 0) {
    return (
      <section aria-label="ملخص الطلب" className="space-y-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <h2 className="text-lg font-bold text-slate-900">ملخص الطلب</h2>
        <p className="text-sm text-slate-600">لا تتوفر حاليًا عروض شراء أو إيجار لهذا الكتاب.</p>
        <p className="text-xs text-slate-500">لذلك لن يظهر زر «شراء الآن» أو «استئجار الآن» قبل إضافة عرض نشط.</p>
      </section>
    );
  }

  const checkoutHref = selectedOffer ? `/checkout?bookId=${bookId}&offerId=${selectedOffer.id}` : "#";
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/books/${bookSlug}`)}`;
  const ctaLabel =
    selectedOffer?.type === "PURCHASE" ? "شراء الكتاب الآن" : selectedOffer?.type === "RENTAL" ? "استئجار الكتاب الآن" : "متابعة إلى صفحة الإتمام";

  return (
    <section aria-label="ملخص الطلب" className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900">ملخص الطلب</h2>
        <p className="text-xs text-slate-600">اختر العرض الأنسب لك ثم انتقل مباشرة إلى إتمام الطلب.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-6 text-slate-700">
        <p className="font-semibold text-slate-900">خيارات الوصول المتاحة</p>
        <ul className="mt-1.5 space-y-1">
          {purchaseOffer ? <li>• شراء رقمي: امتلاك دائم داخل مكتبتك.</li> : null}
          {rentalOffer ? <li>• استئجار رقمي: وصول كامل حسب مدة الإيجار.</li> : null}
          <li>• تتم مراجعة تفاصيل الطلب قبل التأكيد النهائي في صفحة الإتمام.</li>
        </ul>
      </div>

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
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-600">الوصول</dt>
          <dd className="max-w-[65%] text-left font-semibold text-slate-900">{selectedOfferDescription}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">الإجمالي</dt>
          <dd className="font-bold text-indigo-700">
            {selectedOffer ? formatPrice(selectedOffer.priceCents, selectedOffer.currency) : "-"}
          </dd>
        </div>
      </dl>

      {isLoggedIn ? (
        <div className="space-y-2">
          <Link
            href={checkoutHref}
            aria-disabled={!selectedOffer}
            className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 aria-disabled:pointer-events-none aria-disabled:bg-slate-300"
          >
            {ctaLabel}
          </Link>
          <p className="text-xs text-slate-600">بعد الإتمام، سيظهر الكتاب تلقائيًا داخل مكتبتك الرقمية.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Link
            href={loginHref}
            className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            سجّل الدخول لإتمام الشراء
          </Link>
          <p className="text-xs text-slate-600">يمكنك تصفّح التفاصيل بحرية، وتسجيل الدخول فقط عند المتابعة لإتمام الطلب، ثم ستجد الكتاب مباشرة في مكتبتك الرقمية.</p>
        </div>
      )}
    </section>
  );
}

function formatPrice(priceCents: number, currency: string) {
  return formatArabicCurrency(priceCents / 100, { currency });
}
