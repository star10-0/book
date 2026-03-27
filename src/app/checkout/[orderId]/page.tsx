import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
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
  const shamCashDestinationAccount = process.env.SHAM_CASH_DESTINATION_ACCOUNT?.trim() || undefined;
  const selectedLiveProviders = parseSelectedLiveProviders().selectedProviders;

  return (
    <main>
      <SiteHeader />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">إتمام الطلب</h1>
        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          <Link href={`/orders/${order.id}/summary`} className="text-indigo-700 hover:text-indigo-600">
            ملخص الطلب
          </Link>
          <Link href="/account/orders" className="text-indigo-700 hover:text-indigo-600">
            العودة إلى طلباتي
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
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

        <OrderPaymentPanel
          orderId={order.id}
          isPayable={order.status === "PENDING"}
          totalCents={order.totalCents}
          currency={order.currency}
          discountCents={order.discountCents}
          appliedPromoCode={order.promoCode?.code}
          initialAttemptId={latestAttempt?.id}
          initialAttemptStatus={latestAttempt?.status}
          shamCashDestinationAccount={shamCashDestinationAccount}
          enabledLiveProviders={selectedLiveProviders}
        />
      </div>
    </main>
  );
}
