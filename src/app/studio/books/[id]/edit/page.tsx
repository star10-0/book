import { FileKind, UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { updateStudioBookAction, updateStudioBookTextContentAction, type StudioBookFormValues } from "@/app/studio/actions";
import type { BookFormState } from "@/app/admin/books/actions";
import { BookFileManager } from "@/components/admin/book-file-manager";
import { BookForm } from "@/components/admin/book-form";
import { BookTextContentForm } from "@/components/studio/book-text-content-form";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

type EditStudioBookPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ focus?: string }>;
};

function buildContentStatuses(files: { kind: FileKind }[], hasTextContent: boolean) {
  const kinds = new Set(files.map((file) => file.kind));

  return [
    kinds.has(FileKind.PDF) ? "PDF مرفوع" : "لا يوجد محتوى مرفوع بعد",
    kinds.has(FileKind.EPUB) ? "EPUB مرفوع" : "لا يوجد محتوى مرفوع بعد",
    hasTextContent ? "محتوى نصي محفوظ" : "لا يوجد محتوى مرفوع بعد",
  ];
}

export default async function EditStudioBookPage({ params, searchParams }: EditStudioBookPageProps) {
  const user = await requireCreator({ callbackUrl: "/studio/books" });
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;

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

  const contentStatuses = buildContentStatuses(files, Boolean(book.textContent?.trim()));

  return (
    <div className="space-y-4">
      {query?.focus === "content" ? (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-semibold text-indigo-800">
          ✅ تم إنشاء الكتاب. الخطوة التالية: أضف المحتوى الآن عبر رفع PDF/EPUB أو كتابة نص الكتاب داخل المنصة.
        </section>
      ) : null}

      <BookForm
        mode="edit"
        initialValues={initialValues}
        authors={[]}
        categories={categories}
        hideAuthorField
        action={updateStudioBookAction.bind(null, id) as unknown as (state: BookFormState, formData: FormData) => Promise<BookFormState>}
        backHref="/studio/books"
      />

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">محتوى الكتاب (ملفات أو نص)</h2>
          <p className="mt-1 text-sm text-slate-600">يمكنك اختيار أي طريقة: رفع ملفات قراءة (PDF/EPUB) أو كتابة المحتوى النصي مباشرة.</p>
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
          apiBasePath="/api/studio/book-assets"
          initialAssets={files.map((file) => ({
            ...file,
            createdAt: file.createdAt.toISOString(),
          }))}
        />

        <BookTextContentForm
          initialTextContent={book.textContent ?? ""}
          action={updateStudioBookTextContentAction.bind(null, id)}
        />
      </section>
    </div>
  );
}
