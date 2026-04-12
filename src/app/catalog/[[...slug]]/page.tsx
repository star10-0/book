import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BooksGrid } from "@/components/storefront";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth-session";
import { buildCatalogBreadcrumbHref, buildCatalogPath } from "@/lib/categories/path";
import { getPublicCategorySiblings, getPublicRootCategories, resolvePublicCategoryPath } from "@/lib/categories/service";
import { prisma } from "@/lib/prisma";
import { BannerPlacement, getActiveBannersByPlacement } from "@/lib/storefront-banners";
import { StorefrontBanner } from "@/components/home/storefront-banner";

type CatalogPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

type PublicCategoryCardItem = {
  id: string;
  slug: string;
  nameAr: string;
  description: string | null;
  icon: string | null;
  _count: {
    children: number;
    books: number;
  };
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

function resolveIconVisual(icon: string | null): { mode: "image" | "text"; value: string } {
  const fallback = "/icons/source-book-icon.svg";

  if (!icon) {
    return { mode: "image", value: fallback };
  }

  const trimmed = icon.trim();
  if (!trimmed) {
    return { mode: "image", value: fallback };
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { mode: "image", value: trimmed };
  }

  return { mode: "text", value: trimmed };
}

function CategoryGridCard({ category, href, active = false }: { category: PublicCategoryCardItem; href: string; active?: boolean }) {
  const icon = resolveIconVisual(category.icon);

  return (
    <article
      className={`rounded-xl border bg-white transition ${
        active ? "border-emerald-700/45 ring-1 ring-emerald-700/20" : "border-emerald-800/35 hover:border-emerald-800/55"
      }`}
    >
      <Link
        href={href}
        className="flex min-h-[86px] items-center justify-between gap-4 px-5 py-4 text-right sm:min-h-[92px]"
        aria-current={active ? "page" : undefined}
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-slate-600" aria-hidden="true">
          {icon.mode === "image" ? (
            <Image src={icon.value} alt="" width={44} height={44} className="h-11 w-11 object-contain" />
          ) : (
            <span className="text-3xl leading-none">{icon.value}</span>
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-1 text-right">
          <h3 className="line-clamp-2 text-xl font-black text-emerald-900">{category.nameAr}</h3>
          <p className="text-xs font-semibold text-slate-500">{`${category._count.children} تصنيف فرعي • ${category._count.books} كتاب`}</p>
        </div>
      </Link>
    </article>
  );
}

function CategoryCardsGrid({ items, buildHref, activeCategoryId }: { items: PublicCategoryCardItem[]; buildHref: (item: PublicCategoryCardItem) => string; activeCategoryId?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <CategoryGridCard key={item.id} category={item} href={buildHref(item)} active={item.id === activeCategoryId} />
      ))}
    </div>
  );
}

export default async function CatalogBrowsePage({ params }: CatalogPageProps) {
  const { slug } = await params;
  const [user, catalogHeroBanners] = await Promise.all([
    getCurrentUser(),
    getActiveBannersByPlacement(BannerPlacement.CATALOG_HERO, 1),
  ]);
  const catalogHeroBanner = catalogHeroBanners[0] ?? null;

  if (!slug || slug.length === 0) {
    const sections = await getPublicRootCategories();

    return (
      <div className="store-shell space-y-8 pb-10 pt-6 sm:space-y-10 sm:pt-8">
        <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-l from-indigo-50 via-white to-violet-50 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold tracking-wide text-indigo-700">الدليل التعليمي</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">استعرض الأقسام التعليمية</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">ابدأ من قسم رئيسي ثم تابع التدرج حتى تصل إلى الكتب أو المحتوى المطلوب.</p>
        </section>
        {catalogHeroBanner ? <StorefrontBanner banner={catalogHeroBanner} className="rounded-3xl border-indigo-100" /> : null}

        {sections.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">لا توجد أقسام نشطة حاليًا.</p>
        ) : (
          <section>
            <CategoryCardsGrid
              items={sections}
              buildHref={(item) => buildCatalogPath([item.slug])}
            />
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

  const childrenCards: PublicCategoryCardItem[] = resolved.children.map((child) => ({
    id: child.id,
    slug: child.slug,
    nameAr: child.nameAr,
    description: child.description,
    icon: child.icon,
    _count: {
      children: child._count.children,
      books: child._count.books,
    },
  }));

  const siblingCards: PublicCategoryCardItem[] = siblings.map((sibling) => ({
    id: sibling.id,
    slug: sibling.slug,
    nameAr: sibling.nameAr,
    description: sibling.description,
    icon: null,
    _count: {
      children: sibling._count.children,
      books: sibling._count.books,
    },
  }));

  return (
    <div className="store-shell space-y-6 pb-10 pt-6 sm:space-y-8 sm:pt-8">
      {catalogHeroBanner ? <StorefrontBanner banner={catalogHeroBanner} className="rounded-3xl border-indigo-100" /> : null}
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

      {childrenCards.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">التصنيفات الفرعية</h2>
          <CategoryCardsGrid
            items={childrenCards}
            buildHref={(item) => buildCatalogPath([...currentPathSlugs, item.slug])}
          />
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
          لا توجد تصنيفات فرعية ضمن هذا المستوى. إن وُجدت كتب منشورة فستظهر بالأسفل.
        </p>
      )}

      {siblingCards.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">التنقل داخل نفس المستوى</h2>
          <CategoryCardsGrid
            items={siblingCards}
            activeCategoryId={resolved.category.id}
            buildHref={(item) =>
              buildCatalogPath(
                resolved.breadcrumb
                  .slice(0, Math.max(0, resolved.breadcrumb.length - 1))
                  .map((crumb) => crumb.slug)
                  .concat(item.slug),
              )
            }
          />
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
