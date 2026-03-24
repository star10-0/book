import { createBookAction } from "@/app/admin/books/actions";
import { BookForm } from "@/components/admin/book-form";
import { prisma } from "@/lib/prisma";

export default async function NewAdminBookPage() {
  const [authors, categories] = await Promise.all([
    prisma.author.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
    prisma.category.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-semibold">هنا تُدخل بيانات الكتاب الأساسية والتسعير.</p>
        <p className="mt-1">بعد الحفظ، ستنتقل لصفحة التعديل لإضافة: الغلاف وملفات PDF/EPUB أو كتابة المحتوى النصي.</p>
      </section>
      <BookForm mode="create" authors={authors} categories={categories} action={createBookAction} />
    </div>
  );
}
