import Link from "next/link";
import type { CurrencyCode, OfferType, OrderStatus } from "@prisma/client";
import { formatArabicCurrency, formatArabicDate } from "@/lib/formatters/intl";
import { offerTypeLabel, orderStatusMeta } from "@/lib/orders";

type OrderItemView = {
  id: string;
  titleSnapshot: string;
  offerType: OfferType;
  rentalDays: number | null;
  quantity: number;
  unitPriceCents: number;
};

type OrderDetailsCardProps = {
  orderId: string;
  status: OrderStatus;
  currency: CurrencyCode;
  subtotalCents: number;
  totalCents: number;
  discountCents?: number;
  promoCode?: string | null;
  createdAt: Date;
  items: OrderItemView[];
  showCheckoutAction?: boolean;
};

export function OrderDetailsCard({
  orderId,
  status,
  currency,
  subtotalCents,
  totalCents,
  discountCents = 0,
  promoCode,
  createdAt,
  items,
  showCheckoutAction = false,
}: OrderDetailsCardProps) {
  const statusTag = orderStatusMeta[status];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
      <header className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">ملخص الطلب</p>
            <h2 className="mt-1 text-base font-bold text-slate-900">{orderId}</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTag.tone}`}>{statusTag.label}</span>
        </div>
        <p className="text-xs text-slate-500">تاريخ الإنشاء: {formatArabicDate(createdAt)}</p>
      </header>

      <section className="mt-4" aria-label="عناصر الطلب">
        <h3 className="text-sm font-bold text-slate-900">العناصر</h3>
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{item.titleSnapshot}</p>
                <p className="text-sm font-bold text-indigo-700">{formatPrice(item.unitPriceCents * item.quantity, currency)}</p>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {offerTypeLabel[item.offerType]}
                {item.offerType === "RENTAL" && item.rentalDays ? ` - لمدة ${item.rentalDays} يوم` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-bold text-slate-900">الإجمالي</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-600">الإجمالي الفرعي</dt>
            <dd className="font-semibold text-slate-900">{formatPrice(subtotalCents, currency)}</dd>
          </div>
          {discountCents > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-emerald-700">الخصم{promoCode ? ` (${promoCode})` : ""}</dt>
              <dd className="font-semibold text-emerald-700">- {formatPrice(discountCents, currency)}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
            <dt className="font-bold text-slate-800">المبلغ المستحق</dt>
            <dd className="text-lg font-black text-indigo-700">{formatPrice(totalCents, currency)}</dd>
          </div>
        </dl>
      </section>

      {showCheckoutAction ? (
        <div className="mt-5">
          <Link
            href={`/checkout/${orderId}`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            متابعة إلى صفحة الدفع
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function formatPrice(priceCents: number, currency: CurrencyCode) {
  return formatArabicCurrency(priceCents / 100, { currency });
}
