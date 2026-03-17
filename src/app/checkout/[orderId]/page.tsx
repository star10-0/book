import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { OrderDetailsCard } from "@/components/order-details";
import { getOrCreateDemoUser } from "@/lib/auth-demo-user";
import { prisma } from "@/lib/prisma";

type CheckoutPageProps = {
  params: { orderId: string };
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const demoUser = await getOrCreateDemoUser();

  const order = await prisma.order.findFirst({
    where: {
      id: params.orderId,
      userId: demoUser.id,
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
        <h1 className="text-2xl font-bold text-slate-900">إتمام الطلب</h1>
        <Link href="/account/orders" className="text-sm font-semibold text-indigo-700 hover:text-indigo-600">
          العودة إلى طلباتي
        </Link>
      </div>

      <OrderDetailsCard
        orderId={order.id}
        status={order.status}
        currency={order.currency}
        subtotalCents={order.subtotalCents}
        totalCents={order.totalCents}
        createdAt={order.createdAt}
        items={order.items}
      />
    </main>
  );
}
