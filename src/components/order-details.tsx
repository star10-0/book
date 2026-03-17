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
  createdAt,
  items,
  showCheckoutAction = false,
}: OrderDetailsCardProps) {
  const statusTag = orderStatusMeta[status];

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-sm text-slate-500">رقم الطلب</p>
          <h1 className="text-lg font-bold text-slate-900">{orderId}</h1>
        </div>
        <div className="text-left">
          <p className="text-sm text-slate-500">تاريخ الإنشاء</p>
          <p className="font-semibold text-slate-800">{formatArabicDate(createdAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTag.tone}`}>{statusTag.label}</span>
      </header>

      <section className="mt-5 space-y-3" aria-label="عناصر الطلب">
        <h2 className="text-base font-bold text-slate-900">العناصر المختارة</h2>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{item.titleSnapshot}</p>
                <p className="font-bold text-indigo-700">{formatPrice(item.unitPriceCents * item.quantity, currency)}</p>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {offerTypeLabel[item.offerType]}
                {item.offerType === "RENTAL" && item.rentalDays ? ` - لمدة ${item.rentalDays} يوم` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 rounded-xl bg-slate-50 p-4">
        <h2 className="text-base font-bold text-slate-900">الإجماليات</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-600">الإجمالي الفرعي</dt>
            <dd className="font-semibold text-slate-900">{formatPrice(subtotalCents, currency)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
            <dt className="font-bold text-slate-800">الإجمالي الكلي</dt>
            <dd className="text-base font-bold text-indigo-700">{formatPrice(totalCents, currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50 p-4">
        <h2 className="text-base font-bold text-indigo-900">وسيلة الدفع</h2>
        <p className="mt-1 text-sm text-indigo-800">
          سيتم قريبًا تفعيل اختيار وسيلة الدفع (مثل Sham Cash وSyriatel Cash). حالياً الطلب محفوظ بانتظار الدفع.
        </p>
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
