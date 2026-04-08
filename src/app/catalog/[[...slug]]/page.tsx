import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BooksGrid } from "@/components/storefront";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth-session";
import { buildCatalogBreadcrumbHref, buildCatalogPath } from "@/lib/categories/path";
import { getPublicCategorySiblings, getPublicRootCategories, resolvePublicCategoryPath } from "@/lib/categories/service";
import { prisma } from "@/lib/prisma";

type CatalogPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    return {
      title: "الدليل التعليمي",
      description: "تصفح الأقسام التعليمية والجامعية والأنشطة بهيكلية متدرجة ومنظمة.",
      alternates: {
        canonical: "/catalog",
      },
    };
  }

  const resolved = await resolvePublicCategoryPath(slug);

  if (!resolved) {
    return {
      title: "الدليل التعليمي",
    };
  }

  return {
    title: `${resolved.category.nameAr} | الدليل التعليمي`,
    description: resolved.category.description ?? `استكشف قسم ${resolved.category.nameAr} والمحتوى المرتبط به.`,
    alternates: {
      canonical: buildCatalogPath(slug),
    },
  };
}

function TopCategoryCard({ category }: { category: Awaited<ReturnType<typeof getPublicRootCategories>>[number] }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-l from-white via-indigo-50/40 to-violet-50/50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={buildCatalogPath([category.slug])} className="block min-h-44 p-5 sm:p-6">
        <p className="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700">قسم رئيسي</p>
        <h3 className="mt-3 text-xl font-black text-slate-900">{category.nameAr}</h3>
        {category.description ? <p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-600">{category.description}</p> : null}
        <p className="mt-4 text-xs font-semibold text-slate-500">{`${category._count.children} تصنيف فرعي • ${category._count.books} عنصر`}</p>
      </Link>
    </article>
  );
}

function SubCategoryCard({
  href,
  name,
  description,
  childrenCount,
  booksCount,
  active,
}: {
  href: string;
  name: string;
  description: string | null;
  childrenCount: number;
  booksCount: number;
  active: boolean;
}) {
  return (
    <article className={`rounded-2xl border p-4 transition ${active ? "border-indigo-300 bg-indigo-50/70 ring-1 ring-indigo-200" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <Link href={href} className="block">
        <h3 className="line-clamp-2 min-h-11 text-base font-bold text-slate-900">{name}</h3>
        {description ? <p className="mt-1 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">{description}</p> : <div className="min-h-12" />}
        <p className="mt-2 text-xs font-semibold text-slate-500">{`${childrenCount} تصنيف فرعي • ${booksCount} كتاب`}</p>
      </Link>
    </article>
  );
}

export default async function CatalogBrowsePage({ params }: CatalogPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (!slug || slug.length === 0) {
    const sections = await getPublicRootCategories();

    return (
      <div className="store-shell space-y-8 pb-10 pt-6 sm:space-y-10 sm:pt-8">
        <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-l from-indigo-50 via-white to-violet-50 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold tracking-wide text-indigo-700">الدليل التعليمي</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">استعرض الأقسام التعليمية</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">ابدأ من قسم رئيسي ثم تابع التدرج حتى تصل إلى الكتب أو المحتوى المطلوب.</p>
        </section>

        {sections.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">لا توجد أقسام نشطة حاليًا.</p>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <TopCategoryCard key={section.id} category={section} />
            ))}
          </section>
        )}

        <SiteFooter />
      </div>
    );
  }

  const resolved = await resolvePublicCategoryPath(slug);
  if (!resolved) {
    notFound();
  }
  const siblings = await getPublicCategorySiblings(resolved.category.parentId, resolved.category.id);

  const linkedBookIds = resolved.books.map((book) => book.id);
  const wishlistItems =
    user && linkedBookIds.length > 0
      ? await prisma.wishlistItem.findMany({
          where: { userId: user.id, bookId: { in: linkedBookIds } },
          select: { bookId: true },
        })
      : [];

  const wishlistIds = new Set(wishlistItems.map((item) => item.bookId));

  const books = resolved.books.map((book) => {
    const reviewsCount = book.reviews.length;
    const averageRating = reviewsCount > 0 ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount : 0;

    return {
      id: book.id,
      slug: book.slug,
      title: book.titleAr,
      author: book.author.nameAr,
      category: book.category.nameAr,
      publisher:
        book.metadata && typeof book.metadata === "object" && !Array.isArray(book.metadata) && "publisher" in book.metadata
          ? String(book.metadata.publisher ?? "") || null
          : null,
      coverImageUrl: book.coverImageUrl,
      offers: book.offers,
      averageRating,
      reviewsCount,
      isWishlisted: wishlistIds.has(book.id),
      isLoggedIn: Boolean(user),
    };
  });

  const currentPathSlugs = resolved.breadcrumb.map((item) => item.slug);

  return (
    <div className="store-shell space-y-6 pb-10 pt-6 sm:space-y-8 sm:pt-8">
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-l from-white via-indigo-50/60 to-violet-50/70 p-6 shadow-sm sm:p-8">
        <nav aria-label="مسار التصفح" className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Link href={buildCatalogPath([])} className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-700 hover:bg-indigo-200">
            الدليل التعليمي
          </Link>
          {resolved.breadcrumb.map((item, index) => {
            const href = buildCatalogBreadcrumbHref(
              resolved.breadcrumb.map((crumb) => crumb.slug),
              index,
            );
            const isLast = index === resolved.breadcrumb.length - 1;
            return (
              <span key={item.id} className="flex items-center gap-1.5">
                <span className="text-slate-400">/</span>
                {isLast ? (
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">{item.nameAr}</span>
                ) : (
                  <Link href={href} className="rounded-full bg-white px-2.5 py-1 hover:bg-slate-100">
                    {item.nameAr}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">{resolved.category.nameAr}</h1>
        {resolved.category.description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">{resolved.category.description}</p> : null}
      </section>

      {resolved.children.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">التصنيفات الفرعية</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {resolved.children.map((child) => (
              <SubCategoryCard
                key={child.id}
                href={buildCatalogPath([...currentPathSlugs, child.slug])}
                name={child.nameAr}
                description={child.description}
                childrenCount={child._count.children}
                booksCount={child._count.books}
                active={false}
              />
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
          لا توجد تصنيفات فرعية ضمن هذا المستوى. إن وُجدت كتب منشورة فستظهر بالأسفل.
        </p>
      )}

      {siblings.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">التنقل داخل نفس المستوى</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {siblings.map((sibling) => {
              const href = buildCatalogPath(
                resolved.breadcrumb
                  .slice(0, Math.max(0, resolved.breadcrumb.length - 1))
                  .map((crumb) => crumb.slug)
                  .concat(sibling.slug),
              );

              return (
                <SubCategoryCard
                  key={sibling.id}
                  href={href}
                  name={sibling.nameAr}
                  description={sibling.description}
                  childrenCount={sibling._count.children}
                  booksCount={sibling._count.books}
                  active={sibling.isCurrent}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">المحتوى المتاح</h2>
        {books.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">لا يوجد محتوى منشور في هذا التصنيف حاليًا.</p>
        ) : (
          <BooksGrid books={books} />
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
