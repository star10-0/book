import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";

type CreatorPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { slug } = await params;

  const profile = await prisma.creatorProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true } },
    },
  });

  if (!profile) {
    notFound();
  }

  const books = await prisma.book.findMany({
    where: {
      creatorId: profile.user.id,
      status: "PUBLISHED",
      format: "DIGITAL",
    },
    orderBy: { createdAt: "desc" },
    include: {
      offers: {
        where: { isActive: true },
        orderBy: { priceCents: "asc" },
      },
    },
  });

  return (
    <main>
      <SiteHeader />
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{profile.displayName}</h1>
        <p className="mt-2 text-sm text-slate-600">{profile.bio ?? "لا توجد نبذة متاحة بعد."}</p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">كتب الكاتب</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <article key={book.id} className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">{book.titleAr}</h3>
              <p className="mt-2 text-xs text-slate-500 line-clamp-2">{book.descriptionAr ?? "بدون وصف"}</p>
              <p className="mt-2 text-xs text-slate-600">
                {book.offers.length > 0 ? `ابتداءً من ${(book.offers[0].priceCents / 100).toLocaleString("ar-SY")} ل.س` : "بدون عروض حالياً"}
              </p>
              <Link href={`/books/${book.slug}`} className="mt-3 inline-block text-sm font-semibold text-indigo-700 underline underline-offset-2">
                عرض الكتاب
              </Link>
            </article>
          ))}
          {books.length === 0 ? <p className="text-sm text-slate-500">لا توجد كتب منشورة لهذا الكاتب بعد.</p> : null}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
