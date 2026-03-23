import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { OrderDetailsCard } from "@/components/order-details";
import { requireUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

type OrderSummaryPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderSummaryPage({ params }: OrderSummaryPageProps) {
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
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <main>
      <SiteHeader />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">ملخص الطلب</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
          <Link href="/account/orders" className="text-indigo-700 hover:text-indigo-600">
            طلباتي
          </Link>
          <Link href={`/checkout/${order.id}`} className="text-indigo-700 hover:text-indigo-600">
            الانتقال للدفع
          </Link>
        </div>
      </div>

      <OrderDetailsCard
        orderId={order.id}
        status={order.status}
        currency={order.currency}
        subtotalCents={order.subtotalCents}
        totalCents={order.totalCents}
        createdAt={order.createdAt}
        items={order.items}
        showCheckoutAction={order.status === "PENDING"}
      />
    </main>
  );
}
