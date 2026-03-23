import { notFound } from "next/navigation";
import { updateBookAction, type BookFormValues } from "@/app/admin/books/actions";
import { BookForm } from "@/components/admin/book-form";
import { prisma } from "@/lib/prisma";

type EditBookPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAdminBookPage({ params }: EditBookPageProps) {
  const { id } = await params;

  const [book, authors, categories] = await Promise.all([
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
  };

  return <BookForm mode="edit" initialValues={initialValues} authors={authors} categories={categories} action={updateBookAction.bind(null, id)} />;
}
