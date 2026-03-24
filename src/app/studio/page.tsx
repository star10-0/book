import Link from "next/link";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export default async function StudioDashboardPage() {
  const user = await requireCreator({ callbackUrl: "/studio" });

  const [booksCount, publishedCount, ordersCount] = await Promise.all([
    prisma.book.count({ where: user.role === "ADMIN" ? {} : { creatorId: user.id } }),
    prisma.book.count({ where: user.role === "ADMIN" ? { status: "PUBLISHED" } : { creatorId: user.id, status: "PUBLISHED" } }),
    prisma.orderItem.count({ where: user.role === "ADMIN" ? {} : { book: { creatorId: user.id } } }),
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">مرحبًا بك في لوحة الكاتب</h2>
        <p className="mt-2 text-sm text-slate-600">من هنا يمكنك نشر كتبك، إدارة عروض البيع/الإيجار، ومتابعة الطلبات.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/studio/books/new" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
            إضافة كتاب جديد
          </Link>
          <Link href="/studio/profile" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
            تعديل الملف العام
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي الكتب</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{booksCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">كتب منشورة</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{publishedCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">طلبات على كتبك</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{ordersCount}</p>
        </article>
      </section>
    </div>
  );
}
