import { createBookAction } from "@/app/admin/books/actions";
import { BookForm } from "@/components/admin/book-form";
import { ensureDevelopmentCategories } from "@/lib/default-categories";
import { requireAdminScope } from "@/lib/auth-session";
import { getAdminCategoryFlatOptions } from "@/lib/categories/service";
import { prisma } from "@/lib/prisma";

type NewAdminBookPageProps = {
  searchParams?: Promise<{ categoryId?: string }>;
};

export default async function NewAdminBookPage({ searchParams }: NewAdminBookPageProps) {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/books/new" });
  const query = searchParams ? await searchParams : undefined;
  await ensureDevelopmentCategories();
  const [authors, categories, selectedCategory] = await Promise.all([
    prisma.author.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
    getAdminCategoryFlatOptions(),
    query?.categoryId
      ? prisma.category.findUnique({
          where: { id: query.categoryId },
          select: { id: true, nameAr: true },
        })
      : null,
  ]);

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    nameAr: category.nameAr,
    label: `${"— ".repeat(category.depth)}${category.nameAr}${category.isActive ? "" : " (غير نشط)"}`,
  }));

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-semibold">هنا تُدخل بيانات الكتاب الأساسية والتسعير.</p>
        <p className="mt-1">بعد الحفظ، ستنتقل لصفحة التعديل لإضافة: الغلاف وملفات PDF/EPUB أو كتابة المحتوى النصي.</p>
      </section>
      {selectedCategory ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">تم اختيار التصنيف مسبقًا: {selectedCategory.nameAr}</p>
          <p className="mt-1">يمكنك تغييره من حقل التصنيف داخل النموذج إذا لزم.</p>
        </section>
      ) : null}
      <BookForm
        mode="create"
        authors={authors}
        categories={categoryOptions}
        initialValues={selectedCategory ? { categoryId: selectedCategory.id } : undefined}
        action={createBookAction}
      />
    </div>
  );
}
