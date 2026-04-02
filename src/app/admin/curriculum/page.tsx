import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { CurriculumManager } from "@/components/admin/curriculum-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminCurriculumPage() {
  const [levels, books] = await Promise.all([
    prisma.curriculumLevel.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        nameAr: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        books: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            sortOrder: true,
            book: {
              select: {
                id: true,
                titleAr: true,
                slug: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.book.findMany({
      orderBy: { titleAr: "asc" },
      select: {
        id: true,
        titleAr: true,
        slug: true,
        status: true,
      },
    }),
  ]);

  return (
    <AdminPageCard>
      <AdminPageHeader
        title="إدارة المنهاج"
        description="إضافة مستويات المنهاج، تعديلها، وربط الكتب بكل مستوى مع ترتيب ظهورها."
      />
      <CurriculumManager
        levels={levels.map((level) => ({
          ...level,
          linkedBooks: level.books,
        }))}
        books={books}
      />
    </AdminPageCard>
  );
}
