"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BookOffer, OfferType } from "@prisma/client";
import { formatArabicCurrency } from "@/lib/formatters/intl";

type CheckoutOffer = Pick<BookOffer, "id" | "type" | "priceCents" | "currency" | "rentalDays">;

type OrderSummaryCardProps = {
  bookId: string;
  bookTitle: string;
  offers: CheckoutOffer[];
};

const offerLabelByType: Record<OfferType, string> = {
  PURCHASE: "شراء رقمي",
  RENTAL: "استئجار رقمي",
};

export function OrderSummaryCard({ bookId, bookTitle, offers }: OrderSummaryCardProps) {
  const [selectedOfferId, setSelectedOfferId] = useState<string>(offers[0]?.id ?? "");

  const selectedOffer = useMemo(() => offers.find((offer) => offer.id === selectedOfferId) ?? null, [offers, selectedOfferId]);

  if (offers.length === 0) {
    return null;
  }

  const checkoutHref = selectedOffer ? `/checkout?bookId=${bookId}&offerId=${selectedOffer.id}` : "#";

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

      <Link
        href={checkoutHref}
        aria-disabled={!selectedOffer}
        className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 aria-disabled:pointer-events-none aria-disabled:bg-slate-300"
      >
        متابعة إلى صفحة الإتمام
      </Link>
    </section>
  );
}

function formatPrice(priceCents: number, currency: string) {
  return formatArabicCurrency(priceCents / 100, { currency });
}
