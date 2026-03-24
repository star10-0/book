import { FileKind } from "@prisma/client";
import { notFound } from "next/navigation";
import { updateAdminBookTextContentAction, updateBookAction, type BookFormValues } from "@/app/admin/books/actions";
import { BookFileManager } from "@/components/admin/book-file-manager";
import { BookForm } from "@/components/admin/book-form";
import { BookTextContentForm } from "@/components/studio/book-text-content-form";
import { prisma } from "@/lib/prisma";

type EditBookPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{ focus?: string }>;
};

function buildContentStatuses(files: { kind: FileKind }[], hasTextContent: boolean) {
  const kinds = new Set(files.map((file) => file.kind));

  return [
    kinds.has(FileKind.COVER_IMAGE) ? "تم رفع الغلاف" : "لا يوجد غلاف مرفوع",
    kinds.has(FileKind.PDF) ? "PDF مرفوع" : "لا يوجد PDF مرفوع",
    kinds.has(FileKind.EPUB) ? "EPUB مرفوع" : "لا يوجد EPUB مرفوع",
    hasTextContent ? "المحتوى النصي محفوظ" : "لا يوجد محتوى نصي محفوظ",
  ];
}

export default async function EditAdminBookPage({ params, searchParams }: EditBookPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;

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
  const contentStatuses = buildContentStatuses(files, Boolean(book.textContent?.trim()));

  return (
    <div className="space-y-4">
      {query?.focus === "content" ? (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-semibold text-indigo-800">
          ✅ تم إنشاء الكتاب. الخطوة التالية: أضف الغلاف وملف PDF/EPUB أو اكتب المحتوى النصي.
        </section>
      ) : null}

      <BookForm mode="edit" initialValues={initialValues} authors={authors} categories={categories} action={updateBookAction.bind(null, id)} />

      <section
        id="content-section"
        className={`space-y-4 rounded-2xl border bg-white p-6 shadow-sm ${query?.focus === "content" ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200"}`}
      >
        <div>
          <h2 className="text-xl font-bold text-slate-900">قسم المحتوى (الخطوة 2)</h2>
          <p className="mt-1 text-sm text-slate-600">من هنا ترفع الغلاف وملفات القراءة، أو تكتب المحتوى النصي مباشرة.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {contentStatuses.map((status, index) => (
            <span key={`${status}-${index}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {status}
            </span>
          ))}
        </div>

        <BookFileManager
          bookId={id}
          initialAssets={files.map((file) => ({
            ...file,
            createdAt: file.createdAt.toISOString(),
          }))}
        />

        <BookTextContentForm
          initialTextContent={book.textContent ?? ""}
          action={updateAdminBookTextContentAction.bind(null, id)}
        />
      </section>
    </div>
  );
}
