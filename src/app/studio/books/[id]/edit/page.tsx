import { FileKind, UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { updateStudioBookAction, updateStudioBookTextContentAction, type StudioBookFormValues } from "@/app/studio/actions";
import type { BookFormState } from "@/app/admin/books/actions";
import { BookFileManager } from "@/components/admin/book-file-manager";
import { BookForm } from "@/components/admin/book-form";
import { BookTextContentForm } from "@/components/studio/book-text-content-form";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { buildBookInitialValues } from "@/lib/services/book-form";

type EditStudioBookPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ focus?: string }>;
};

function buildContentStatuses(files: { kind: FileKind }[], hasTextContent: boolean) {
  const kinds = new Set(files.map((file) => file.kind));

  return [
    { label: "رفع الغلاف", done: kinds.has(FileKind.COVER_IMAGE), doneText: "تم رفع الغلاف", emptyText: "لا يوجد غلاف مرفوع" },
    { label: "رفع PDF", done: kinds.has(FileKind.PDF), doneText: "PDF مرفوع", emptyText: "لا يوجد PDF مرفوع" },
    { label: "رفع EPUB", done: kinds.has(FileKind.EPUB), doneText: "EPUB مرفوع", emptyText: "لا يوجد EPUB مرفوع" },
    { label: "كتابة المحتوى النصي", done: hasTextContent, doneText: "المحتوى النصي محفوظ", emptyText: "لا يوجد محتوى نصي محفوظ" },
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

  const initialValues: StudioBookFormValues = buildBookInitialValues({
    titleAr: book.titleAr,
    slug: book.slug,
    categoryId: book.categoryId,
    status: book.status,
    contentAccessPolicy: book.contentAccessPolicy,
    descriptionAr: book.descriptionAr,
    metadata: book.metadata,
    offers: book.offers,
  });

  const contentStatuses = buildContentStatuses(files, Boolean(book.textContent?.trim()));

  return (
    <div className="space-y-4" dir="rtl">
      {query?.focus === "content" ? (
        <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">✅ تم إنشاء الكتاب بنجاح.</p>
          <p className="font-semibold">الخطوة التالية الآن هي إكمال المحتوى من نفس الصفحة:</p>
          <ul className="space-y-1 text-xs">
            <li>• رفع الغلاف</li>
            <li>• رفع PDF</li>
            <li>• رفع EPUB</li>
            <li>• كتابة المحتوى النصي</li>
          </ul>
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

      <section
        id="content-section"
        className={`space-y-4 rounded-2xl border bg-white p-6 shadow-sm ${query?.focus === "content" ? "border-indigo-400 ring-2 ring-indigo-200" : "border-slate-200"}`}
      >
        <div>
          <h2 className="text-xl font-bold text-slate-900">قسم المحتوى (الخطوة 2)</h2>
          <p className="mt-1 text-sm text-slate-600">
            بعد حفظ بيانات الكتاب، أكمل المحتوى من هنا: رفع الغلاف وملفات القراءة أو كتابة المحتوى النصي.
          </p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
          <p className="font-semibold">أولوية هذه الصفحة الآن: المحتوى أولًا ثم النشر.</p>
          <p className="mt-1 text-xs">
            عند اكتمال عناصر المحتوى الأساسية (الغلاف + ملف قراءة أو نص)، عد إلى «كتبي» واستخدم زر «نشر».
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {contentStatuses.map((statusItem) => (
            <article
              key={statusItem.label}
              className={`rounded-xl border p-3 text-xs ${statusItem.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
            >
              <p className="font-bold">{statusItem.label}</p>
              <p className="mt-1 font-semibold">{statusItem.done ? statusItem.doneText : statusItem.emptyText}</p>
            </article>
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
