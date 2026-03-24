import { createStudioBookAction } from "@/app/studio/actions";
import type { BookFormState } from "@/app/admin/books/actions";
import { BookForm } from "@/components/admin/book-form";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export default async function NewStudioBookPage() {
  await requireCreator({ callbackUrl: "/studio/books/new" });

  const categories = await prisma.category.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } });

  const action = createStudioBookAction as unknown as (state: BookFormState, formData: FormData) => Promise<BookFormState>;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-semibold">هنا تُدخل بيانات الكتاب الأساسية والتسعير.</p>
        <p className="mt-1">بعد الحفظ، ستنتقل لصفحة التعديل لإضافة: الغلاف وملفات PDF/EPUB أو كتابة المحتوى النصي.</p>
      </section>
      <BookForm mode="create" categories={categories} authors={[]} hideAuthorField action={action} backHref="/studio/books" />
    </div>
  );
}
