import { createStudioBookAction } from "@/app/studio/actions";
import type { BookFormState } from "@/app/admin/books/actions";
import { BookForm } from "@/components/admin/book-form";
import { requireCreator } from "@/lib/auth-session";
import { ensureDevelopmentCategories } from "@/lib/default-categories";
import { prisma } from "@/lib/prisma";

export default async function NewStudioBookPage() {
  await ensureDevelopmentCategories();
  await requireCreator({ callbackUrl: "/studio/books/new" });

  const categories = await prisma.category.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } });

  const action = createStudioBookAction as unknown as (state: BookFormState, formData: FormData) => Promise<BookFormState>;

  return (
    <div className="space-y-4" dir="rtl">
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-900">
        <p className="font-semibold">الخطوة 1: أدخل البيانات الأساسية والتسعير أولًا.</p>
        <p className="mt-1">في هذه الصفحة تُنشئ الكتاب فقط (العنوان، التصنيف، الأسعار، وسياسات النشر).</p>
        <div className="mt-3 rounded-xl border border-indigo-200 bg-white/80 p-3">
          <p className="text-xs font-semibold text-indigo-800">الخطوة 2 بعد الحفظ (من صفحة التعديل):</p>
          <ul className="mt-2 space-y-1 text-xs text-indigo-900">
            <li>• رفع الغلاف</li>
            <li>• رفع PDF</li>
            <li>• رفع EPUB</li>
            <li>• كتابة المحتوى النصي</li>
          </ul>
        </div>
      </section>
      <BookForm mode="create" categories={categories} authors={[]} hideAuthorField action={action} backHref="/studio/books" />
    </div>
  );
}
