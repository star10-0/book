import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDetailsCard } from "@/components/order-details";
import { OrderPaymentPanel } from "@/components/order-payment-panel";
import { requireUser } from "@/lib/auth-session";
import { parseSelectedLiveProviders } from "@/lib/payments/gateways/provider-integration";
import { prisma } from "@/lib/prisma";

type CheckoutPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const user = await requireUser();
  const { orderId } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
      paymentAttempts: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      promoCode: {
        select: { code: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const latestAttempt = order.paymentAttempts[0];
  const initialTransactionReference = readTransactionReferenceFromPayload(latestAttempt?.requestPayload);
  const shamCashDestinationAccount = process.env.SHAM_CASH_DESTINATION_ACCOUNT?.trim() || undefined;
  const syriatelCashDestinationAccount = process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT?.trim() || undefined;
  const selectedLiveProviders = parseSelectedLiveProviders().selectedProviders;

  return (
    <main className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-indigo-600">Checkout</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">إتمام الطلب</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              صفحة دفع مركّزة لإكمال طلبك بخطوات واضحة: اختر المزود، نفّذ التحويل، ثم أكمل التحقق.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link href={`/orders/${order.id}/summary`} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
              ملخص الطلب
            </Link>
            <Link href="/account/orders" className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
              العودة إلى طلباتي
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)] xl:items-start">
        <OrderPaymentPanel
          orderId={order.id}
          isPayable={order.status === "PENDING"}
          totalCents={order.totalCents}
          currency={order.currency}
          discountCents={order.discountCents}
          appliedPromoCode={order.promoCode?.code}
          initialAttemptId={latestAttempt?.id}
          initialAttemptStatus={latestAttempt?.status}
          initialTransactionReference={initialTransactionReference}
          shamCashDestinationAccount={shamCashDestinationAccount}
          syriatelCashDestinationAccount={syriatelCashDestinationAccount}
          enabledLiveProviders={selectedLiveProviders}
        />

        <div className="xl:sticky xl:top-24">
          <OrderDetailsCard
            orderId={order.id}
            status={order.status}
            currency={order.currency}
            subtotalCents={order.subtotalCents}
            totalCents={order.totalCents}
            discountCents={order.discountCents}
            promoCode={order.promoCode?.code}
            createdAt={order.createdAt}
            items={order.items}
          />
        </div>
      </div>
    </main>
  );
}

function readTransactionReferenceFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const value = (payload as Record<string, unknown>).transactionReference;
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
