import Link from "next/link";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { CurriculumManager } from "@/components/admin/curriculum-manager";
import { loadCurriculumIntegritySnapshot } from "@/lib/curriculum/integrity";
import { requireCurriculumAdmin } from "@/lib/curriculum/permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminCurriculumPage() {
  await requireCurriculumAdmin();

  const [levels, books, integrity] = await Promise.all([
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
    loadCurriculumIntegritySnapshot(),
  ]);

  return (
    <AdminPageCard>
      <AdminPageHeader
        title="إدارة المنهاج"
        description="إضافة مستويات المنهاج، تعديلها، وربط الكتب بكل مستوى مع ترتيب ظهورها."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-600">إجمالي المستويات</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{integrity.totals.levels.toLocaleString("ar-SY")}</p>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">مستويات فارغة</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{integrity.totals.emptyLevels.toLocaleString("ar-SY")}</p>
        </article>
        <article className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs text-indigo-700">كتب بلا تعيين منهاج</p>
          <p className="mt-2 text-2xl font-bold text-indigo-900">{integrity.totals.unassignedBooks.toLocaleString("ar-SY")}</p>
        </article>
        <article className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs text-rose-700">تكرار ترتيب المستويات</p>
          <p className="mt-2 text-2xl font-bold text-rose-900">{integrity.totals.duplicateLevelOrders.toLocaleString("ar-SY")}</p>
        </article>
        <article className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs text-rose-700">تكرار ترتيب الكتب</p>
          <p className="mt-2 text-2xl font-bold text-rose-900">{integrity.totals.duplicateBookOrders.toLocaleString("ar-SY")}</p>
        </article>
      </section>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <Link href="#empty-levels" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          الانتقال إلى المستويات الفارغة
        </Link>
        <Link href="#unassigned-books" className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900">
          الانتقال إلى الكتب غير المعيّنة
        </Link>
        <Link href="#ordering-issues" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
          الانتقال إلى مشاكل الترتيب
        </Link>
      </section>

      <section id="empty-levels" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-sm font-bold text-amber-900">المستويات الفارغة</h3>
        {integrity.emptyLevels.length === 0 ? (
          <p className="mt-2 text-xs text-amber-800">لا توجد مستويات فارغة حالياً.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {integrity.emptyLevels.map((level) => (
              <li key={level.id}>{`${level.nameAr} (${level.slug})`}</li>
            ))}
          </ul>
        )}
      </section>

      <section id="unassigned-books" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <h3 className="text-sm font-bold text-indigo-900">كتب بلا تعيين منهاج</h3>
        {integrity.unassignedBooks.length === 0 ? (
          <p className="mt-2 text-xs text-indigo-800">جميع الكتب مربوطة بمستويات منهاج.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-indigo-900">
            {integrity.unassignedBooks.slice(0, 12).map((book) => (
              <li key={book.id}>{`${book.titleAr} (${book.slug})`}</li>
            ))}
          </ul>
        )}
      </section>

      <section id="ordering-issues" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <h3 className="text-sm font-bold text-rose-900">مشاكل الترتيب</h3>
        {integrity.duplicateLevelOrderGroups.length === 0 && integrity.duplicateBookOrderGroups.length === 0 ? (
          <p className="mt-2 text-xs text-rose-800">لا توجد تكرارات ترتيب حالياً.</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm text-rose-900">
            {integrity.duplicateLevelOrderGroups.map((group) => (
              <p key={`level-order-${group.sortOrder}`}>ترتيب مستويات مكرر ({group.sortOrder}): {group.levels.map((level) => level.nameAr).join("، ")}</p>
            ))}
            {integrity.duplicateBookOrderGroups.map((group) => (
              <p key={`book-order-${group.levelId}-${group.sortOrder}`}>المستوى {group.levelNameAr} يحتوي {group.count} كتب بنفس ترتيب {group.sortOrder}.</p>
            ))}
          </div>
        )}
      </section>

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
