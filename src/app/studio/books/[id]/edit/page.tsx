import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { updateStudioBookAction, type StudioBookFormValues } from "@/app/studio/actions";
import type { BookFormState } from "@/app/admin/books/actions";
import { BookFileManager } from "@/components/admin/book-file-manager";
import { BookForm } from "@/components/admin/book-form";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

type EditStudioBookPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditStudioBookPage({ params }: EditStudioBookPageProps) {
  const user = await requireCreator({ callbackUrl: "/studio/books" });
  const { id } = await params;

  const [book, categories, files] = await Promise.all([
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

  if (!book || (user.role !== UserRole.ADMIN && book.creatorId !== user.id)) {
    notFound();
  }

  const purchaseOffer = book.offers.find((offer) => offer.type === "PURCHASE");
  const rentalOffer = book.offers.find((offer) => offer.type === "RENTAL");

  const initialValues: StudioBookFormValues = {
    titleAr: book.titleAr,
    slug: book.slug,
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
      <BookForm
        mode="edit"
        initialValues={initialValues}
        authors={[]}
        categories={categories}
        hideAuthorField
        action={updateStudioBookAction.bind(null, id) as unknown as (state: BookFormState, formData: FormData) => Promise<BookFormState>}
        backHref="/studio/books"
      />
      <BookFileManager
        bookId={id}
        apiBasePath="/api/studio/book-assets"
        initialAssets={files.map((file) => ({
          ...file,
          createdAt: file.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
