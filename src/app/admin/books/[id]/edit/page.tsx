import { notFound } from "next/navigation";
import { updateBookAction, type BookFormValues } from "@/app/admin/books/actions";
import { BookFileManager } from "@/components/admin/book-file-manager";
import { BookForm } from "@/components/admin/book-form";
import { prisma } from "@/lib/prisma";

type EditBookPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAdminBookPage({ params }: EditBookPageProps) {
  const { id } = await params;

  const [book, authors, categories, files] = await Promise.all([
    prisma.book.findUnique({
      where: { id },
      include: {
        offers: {
          where: {
            type: {
              in: ["PURCHASE", "RENTAL"],
            },
          },
        },
      },
    }),
    prisma.author.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
    prisma.category.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
    prisma.bookFile.findMany({
      where: {
        bookId: id,
        kind: { in: ["COVER_IMAGE", "EPUB", "PDF"] },
        sortOrder: 0,
      },
      select: {
        id: true,
        bookId: true,
        kind: true,
        publicUrl: true,
        originalFileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!book) {
    notFound();
  }

  const purchaseOffer = book.offers.find((offer) => offer.type === "PURCHASE");
  const rentalOffer = book.offers.find((offer) => offer.type === "RENTAL");

  const initialValues: BookFormValues = {
    titleAr: book.titleAr,
    slug: book.slug,
    authorId: book.authorId,
    categoryId: book.categoryId,
    purchasePrice: purchaseOffer ? String(purchaseOffer.priceCents / 100) : "",
    rentalPrice: rentalOffer ? String(rentalOffer.priceCents / 100) : "",
    rentalDays: rentalOffer?.rentalDays ? String(rentalOffer.rentalDays) : "14",
    publicationStatus: book.status.toLowerCase(),
    buyOfferEnabled: purchaseOffer?.isActive ? "enabled" : "disabled",
    rentOfferEnabled: rentalOffer?.isActive ? "enabled" : "disabled",
    description: book.descriptionAr ?? "",
    metadata: book.metadata ? JSON.stringify(book.metadata, null, 2) : "",
  };

  return (
    <div className="space-y-4">
      <BookForm mode="edit" initialValues={initialValues} authors={authors} categories={categories} action={updateBookAction.bind(null, id)} />
      <BookFileManager
        bookId={id}
        initialAssets={files.map((file) => ({
          ...file,
          createdAt: file.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
