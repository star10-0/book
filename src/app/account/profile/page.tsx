import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth-session";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

export default async function AccountProfilePage() {
  const user = await requireUser({ callbackUrl: "/account/profile" });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      fullName: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
          accessGrants: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  return (
    <main>
      <SiteHeader />
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">الملف الشخصي</h1>
          <p className="text-sm text-slate-600">معلومات الحساب الأساسية وإحصاءات نشاطك في المنصة.</p>
        </header>

        <section className="grid gap-4 lg:grid-cols-3" aria-label="معلومات المستخدم">
          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900">بيانات الحساب</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">الاسم الكامل</dt>
                <dd className="mt-1 font-semibold text-slate-900">{profile.fullName ?? "غير محدد"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">البريد الإلكتروني</dt>
                <dd className="mt-1 font-semibold text-slate-900">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">تاريخ إنشاء الحساب</dt>
                <dd className="mt-1 font-semibold text-slate-900">{formatArabicDate(profile.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">حالة الحساب</dt>
                <dd className="mt-1 font-semibold text-emerald-700">نشط</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">ملخص سريع</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span>إجمالي الطلبات</span>
                <strong>{profile._count.orders}</strong>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span>الوصولات النشطة والسابقة</span>
                <strong>{profile._count.accessGrants}</strong>
              </li>
            </ul>
          </article>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-900">ماذا تريد أن تفعل الآن؟</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/account/orders" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
              عرض الطلبات
            </Link>
            <Link href="/account/library" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
              فتح المكتبة
            </Link>
            <Link href="/account/rentals" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
              متابعة الإعارات
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
