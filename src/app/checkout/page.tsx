import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { CheckoutCreateOrderCard } from "@/components/checkout-create-order-card";
import { requireUser } from "@/lib/auth-session";
import { isOfferCurrentlyAvailable } from "@/lib/orders/create-order";
import { prisma } from "@/lib/prisma";

type CheckoutSelectionPageProps = {
  searchParams: Promise<{ bookId?: string; offerId?: string }>;
};

export default async function CheckoutSelectionPage({ searchParams }: CheckoutSelectionPageProps) {
  await requireUser();

  const params = await searchParams;
  const bookId = params.bookId?.trim();
  const offerId = params.offerId?.trim();

  if (!bookId || !offerId) {
    notFound();
  }

  const offer = await prisma.bookOffer.findFirst({
    where: {
      id: offerId,
      bookId,
    },
    include: {
      book: {
        select: {
          id: true,
          slug: true,
          titleAr: true,
          status: true,
          format: true,
        },
      },
    },
  });

  if (!offer || !isOfferCurrentlyAvailable(offer, new Date())) {
    notFound();
  }

  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">خطوة المراجعة قبل إنشاء الطلب</h2>
          <Link href={`/books/${offer.book.slug}`} className="text-sm font-semibold text-indigo-700 hover:text-indigo-600">
            العودة للكتاب
          </Link>
        </div>

        <CheckoutCreateOrderCard
          bookId={offer.book.id}
          bookTitle={offer.book.titleAr}
          offer={{
            id: offer.id,
            type: offer.type,
            rentalDays: offer.rentalDays,
            priceCents: offer.priceCents,
            currency: offer.currency,
          }}
        />
      </div>
    </main>
  );
}
