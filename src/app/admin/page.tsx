import { BookAssetAssociations } from "@/components/admin/book-asset-associations";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [books, assets] = await Promise.all([
    prisma.book.findMany({
      select: {
        id: true,
        titleAr: true,
        slug: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),
    prisma.bookFile.findMany({
      select: {
        id: true,
        kind: true,
        storageProvider: true,
        storageKey: true,
        mimeType: true,
        sizeBytes: true,
        book: {
          select: {
            titleAr: true,
            slug: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    }),
  ]);

  return (
    <main>
      <SiteHeader />
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">لوحة الإدارة</h1>
        <p className="mt-3 text-slate-600">صفحة مبدئية لإدارة المحتوى والكتب وربط الأصول الرقمية.</p>
      </section>

      <BookAssetAssociations books={books} assets={assets} />
    </main>
  );
}
