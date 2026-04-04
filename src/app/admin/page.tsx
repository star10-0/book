import { BookStatus, PaymentAttemptStatus } from "@prisma/client";
import Link from "next/link";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { prisma } from "@/lib/prisma";

type HubSection = {
  href: string;
  title: string;
  description: string;
  badge?: string;
};

export default async function AdminDashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    usersCount,
    booksCount,
    publishedBooksCount,
    todayOrdersCount,
    pendingReviewPaymentsCount,
    unresolvedSecurityEvents,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.book.count(),
    prisma.book.count({ where: { status: BookStatus.PUBLISHED } }),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.paymentAttempt.count({
      where: {
        status: {
          in: [PaymentAttemptStatus.PENDING, PaymentAttemptStatus.SUBMITTED, PaymentAttemptStatus.VERIFYING],
        },
      },
    }),
    prisma.userSecurityEvent.count({ where: { createdAt: { gte: startOfToday } } }),
  ]);

  const metrics = [
    { label: "إجمالي المستخدمين", value: usersCount.toLocaleString("ar-SY") },
    { label: "إجمالي الكتب", value: booksCount.toLocaleString("ar-SY") },
    { label: "كتب منشورة", value: publishedBooksCount.toLocaleString("ar-SY") },
    { label: "طلبات اليوم", value: todayOrdersCount.toLocaleString("ar-SY") },
    { label: "مدفوعات قيد المراجعة", value: pendingReviewPaymentsCount.toLocaleString("ar-SY") },
    { label: "أحداث أمنية اليوم", value: unresolvedSecurityEvents.toLocaleString("ar-SY") },
  ];

  const sections: HubSection[] = [
    { href: "/admin/users", title: "المستخدمون", description: "إدارة حالة الحسابات والإجراءات الأمنية." },
    { href: "/admin/payments", title: "المدفوعات", description: "مراجعة محاولات الدفع ومعالجة الحالات الحساسة." },
    { href: "/admin/orders", title: "الطلبات", description: "متابعة الطلبات، التقدم، والتسليم الرقمي." },
    { href: "/admin/books", title: "الكتب", description: "إدارة المحتوى والمنشورات وتحديث بيانات الكتب." },
    { href: "/admin/curriculum", title: "المنهاج", description: "تنظيم المستويات وربط المحتوى بالمسارات التعليمية." },
    { href: "/admin/promo-codes", title: "أكواد الخصم", description: "ضبط العروض والتوزيع ومتابعة الاستهلاك." },
    {
      href: "/admin/users",
      title: "الأمن والتدقيق",
      description: "أساس جاهز لسجل التدقيق وإجراءات الأمان في المراحل القادمة.",
      badge: "قريبًا",
    },
  ];

  return (
    <>
      <AdminPageCard>
        <AdminPageHeader
          title="مركز العمليات"
          description="لوحة مختصرة وواضحة لإدارة المستخدمين والمدفوعات والطلبات والمحتوى دون ازدحام."
        />
      </AdminPageCard>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</p>
          </article>
        ))}
      </section>

      <AdminPageCard>
        <AdminPageHeader title="أقسام الإدارة" description="اختر القسم المطلوب للوصول السريع إلى مهام التشغيل اليومية." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={`${section.href}-${section.title}`}
              href={section.href}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-slate-900">{section.title}</p>
                {section.badge ? (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">{section.badge}</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">{section.description}</p>
            </Link>
          ))}
        </div>
      </AdminPageCard>
    </>
  );
}
