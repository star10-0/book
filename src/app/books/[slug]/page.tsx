import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { BookDetailsSection, RelatedBooksSection } from "@/components/book-details";
import { prisma } from "@/lib/prisma";

type BookDetailsPageProps = {
  params: { slug: string };
};

export default async function BookDetailsPage({ params }: BookDetailsPageProps) {
  const { slug } = params;

  const book = await prisma.book.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      format: "DIGITAL",
    },
    include: {
      author: { select: { nameAr: true } },
      category: { select: { id: true, nameAr: true } },
      offers: {
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          priceCents: true,
          currency: true,
          rentalDays: true,
        },
      },
    },
  });

  if (!book) {
    notFound();
  }

  const relatedBooks = await prisma.book.findMany({
    where: {
      status: "PUBLISHED",
      format: "DIGITAL",
      categoryId: book.category.id,
      id: { not: book.id },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: {
      author: { select: { nameAr: true } },
    },
  });

  return (
    <main>
      <SiteHeader />
      <div className="space-y-6">
        <BookDetailsSection
          book={{
            title: book.titleAr,
            author: book.author.nameAr,
            category: book.category.nameAr,
            description: book.descriptionAr,
            coverImageUrl: book.coverImageUrl,
            publicationDate: book.publicationDate,
          }}
          offers={book.offers}
        />

        <RelatedBooksSection
          books={relatedBooks.map((relatedBook) => ({
            id: relatedBook.id,
            slug: relatedBook.slug,
            title: relatedBook.titleAr,
            author: relatedBook.author.nameAr,
            coverImageUrl: relatedBook.coverImageUrl,
          }))}
        />
      </div>
    </main>
  );
}
