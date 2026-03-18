import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { OrderDetailsCard } from "@/components/order-details";
import { OrderPaymentPanel } from "@/components/order-payment-panel";
import { requireUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

type CheckoutPageProps = {
  params: { orderId: string };
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const user = await requireUser();

  const order = await prisma.order.findFirst({
    where: {
      id: params.orderId,
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
    },
  });

  if (!order) {
    notFound();
  }

  const latestAttempt = order.paymentAttempts[0];

  return (
    <main>
      <SiteHeader />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">إتمام الطلب</h1>
        <Link href="/account/orders" className="text-sm font-semibold text-indigo-700 hover:text-indigo-600">
          العودة إلى طلباتي
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <OrderDetailsCard
          orderId={order.id}
          status={order.status}
          currency={order.currency}
          subtotalCents={order.subtotalCents}
          totalCents={order.totalCents}
          createdAt={order.createdAt}
          items={order.items}
        />

        <OrderPaymentPanel
          orderId={order.id}
          isPayable={order.status === "PENDING"}
          initialAttemptId={latestAttempt?.id}
          initialAttemptStatus={latestAttempt?.status}
        />
      </div>
    </main>
  );
}
