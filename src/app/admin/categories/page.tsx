import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      nameAr: true,
      slug: true,
      _count: {
        select: {
          books: true,
        },
      },
    },
    orderBy: {
      nameAr: "asc",
    },
  });

  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة التصنيفات" description="إضافة وتعديل وحذف التصنيفات مع مراعاة الكتب المرتبطة." />
      <CategoriesManager
        categories={categories.map((category) => ({
          id: category.id,
          nameAr: category.nameAr,
          slug: category.slug,
          booksCount: category._count.books,
        }))}
      />
    </AdminPageCard>
  );
}
