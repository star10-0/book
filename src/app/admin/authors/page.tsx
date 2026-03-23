import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AuthorsManager } from "@/components/admin/authors-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminAuthorsPage() {
  const authors = await prisma.author.findMany({
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
      <AdminPageHeader title="إدارة المؤلفين" description="إضافة وتعديل وحذف المؤلفين مع التحقق من الارتباطات بالكتب." />
      <AuthorsManager
        authors={authors.map((author) => ({
          id: author.id,
          nameAr: author.nameAr,
          slug: author.slug,
          booksCount: author._count.books,
        }))}
      />
    </AdminPageCard>
  );
}
