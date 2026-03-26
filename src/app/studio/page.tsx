import Link from "next/link";
import { BookStatus, FileKind, OfferType, OrderStatus } from "@prisma/client";
import { BecomeCreatorForm } from "@/components/studio/become-creator-form";
import { formatArabicCurrency, formatArabicDate } from "@/lib/formatters/intl";
import { requireUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

function formatOfferType(type: OfferType) {
  return type === OfferType.PURCHASE ? "شراء" : "إيجار";
}

export default async function StudioDashboardPage() {
  const user = await requireUser({ callbackUrl: "/studio" });

  if (user.role !== "CREATOR" && user.role !== "ADMIN") {
    return (
      <section className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">ابدأ مسار الكاتب من هنا</h2>
          <p className="mt-2 text-sm text-slate-700">
            حسابك الحالي مناسب للقراءة والشراء. لتحويله إلى حساب كاتب وفتح أدوات الاستوديو، فعّل ملف الكاتب من النموذج التالي.
          </p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
          <p className="font-semibold">بعد التفعيل ستحصل على:</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• صفحة «كتبي» لإدارة المسودات والمنشور.</li>
            <li>• تدفّق واضح: إنشاء بيانات الكتاب ← تعديل المحتوى ← نشر.</li>
            <li>• أكواد خصم خاصة بك للطلبات المؤهلة.</li>
          </ul>
        </div>
        <p className="mt-2 text-sm text-slate-700">
          للوصول إلى إدارة الكتب والنشر، فعّل حساب الكاتب أولًا من النموذج التالي.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          ملاحظة: يبقى مسار الحساب والقارئ كما هو دون أي تأثير على مشترياتك السابقة.
        </p>
        <BecomeCreatorForm suggestedName={user.name ?? user.email.split("@")[0]} />
      </section>
    );
  }

  const creatorScope = { creatorId: user.id };

  const [
    totalBooks,
    publishedBooks,
    draftBooks,
    orderCounts,
    paidOrderItems,
    recentBooks,
    recentOrderItems,
    booksForReadiness,
  ] = await Promise.all([
    prisma.book.count({ where: creatorScope }),
    prisma.book.count({ where: { ...creatorScope, status: BookStatus.PUBLISHED } }),
    prisma.book.count({ where: { ...creatorScope, status: BookStatus.DRAFT } }),
    prisma.orderItem.groupBy({
      by: ["offerType"],
      where: { book: creatorScope },
      _count: { _all: true },
    }),
    prisma.orderItem.findMany({
      where: {
        book: creatorScope,
        order: { status: OrderStatus.PAID },
      },
      select: {
        offerType: true,
        unitPriceCents: true,
        quantity: true,
      },
    }),
    prisma.book.findMany({
      where: creatorScope,
      select: {
        id: true,
        titleAr: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.orderItem.findMany({
      where: { book: creatorScope },
      select: {
        id: true,
        offerType: true,
        createdAt: true,
        book: { select: { titleAr: true } },
        order: { select: { status: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.book.findMany({
      where: creatorScope,
      select: {
        id: true,
        textContent: true,
        files: {
          where: { kind: { in: [FileKind.COVER_IMAGE, FileKind.PDF, FileKind.EPUB] } },
          select: { kind: true },
        },
      },
    }),
  ]);

  const purchaseOrders = orderCounts.find((item) => item.offerType === OfferType.PURCHASE)?._count._all ?? 0;
  const rentalOrders = orderCounts.find((item) => item.offerType === OfferType.RENTAL)?._count._all ?? 0;

  const revenueByType = paidOrderItems.reduce(
    (acc, item) => {
      const value = item.unitPriceCents * item.quantity;
      if (item.offerType === OfferType.PURCHASE) {
        acc.purchase += value;
      } else {
        acc.rental += value;
      }
      acc.total += value;
      return acc;
    },
    { purchase: 0, rental: 0, total: 0 },
  );

  const readiness = booksForReadiness.reduce(
    (acc, book) => {
      const fileKinds = new Set(book.files.map((file) => file.kind));
      if (fileKinds.has(FileKind.COVER_IMAGE)) acc.cover += 1;
      if (fileKinds.has(FileKind.PDF) || fileKinds.has(FileKind.EPUB)) acc.file += 1;
      if (book.textContent?.trim()) acc.text += 1;
      return acc;
    },
    { cover: 0, file: 0, text: 0 },
  );

  const recentActivity = [
    ...recentBooks.map((book) => ({
      id: `book-${book.id}`,
      createdAt: book.updatedAt,
      message: `تحديث الكتاب: ${book.titleAr}`,
      detail: `الحالة: ${book.status === BookStatus.PUBLISHED ? "منشور" : "غير منشور"}`,
    })),
    ...recentOrderItems.map((item) => ({
      id: `order-item-${item.id}`,
      createdAt: item.createdAt,
      message: `${formatOfferType(item.offerType)} جديد على «${item.book.titleAr}»`,
      detail: `رقم الطلب: ${item.order.id} · الحالة: ${item.order.status}`,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  return (
    <div className="space-y-4" dir="rtl">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">مرحبًا بك في لوحة الكاتب</h2>
        <p className="mt-2 text-sm text-slate-600">يمكنك الآن إدارة كتبك الرقمية، متابعة المبيعات والإيجارات، ومراقبة جاهزية المحتوى.</p>
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
          المسار المقترح: 1) أضف كتابًا (البيانات + التسعير) 2) افتح صفحة التعديل لإضافة المحتوى 3) انشر عند الجاهزية.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/studio/books/new" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
            أضف كتابًا
          </Link>
          <Link href="/studio/analytics" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
            التحليلات
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي الكتب</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalBooks}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">كتب منشورة</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{publishedBooks}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">كتب مسودة</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{draftBooks}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي الطلبات</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{purchaseOrders + rentalOrders}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">ملخص الطلبات والإيراد</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-700">
            <p>طلبات الشراء: <span className="font-semibold">{purchaseOrders}</span></p>
            <p>طلبات الإيجار: <span className="font-semibold">{rentalOrders}</span></p>
            <p>إيراد الشراء: <span className="font-semibold">{formatArabicCurrency(revenueByType.purchase / 100)}</span></p>
            <p>إيراد الإيجار: <span className="font-semibold">{formatArabicCurrency(revenueByType.rental / 100)}</span></p>
            <p className="border-t border-slate-200 pt-2">إجمالي الإيراد المدفوع: <span className="font-bold">{formatArabicCurrency(revenueByType.total / 100)}</span></p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">جاهزية المحتوى</h3>
          <p className="mt-1 text-xs text-slate-500">على مستوى جميع كتبك ({totalBooks} كتاب)</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-700">
            <p>كتب فيها غلاف: <span className="font-semibold">{readiness.cover}</span></p>
            <p>كتب فيها ملف قراءة (PDF أو EPUB): <span className="font-semibold">{readiness.file}</span></p>
            <p>كتب فيها محتوى نصي: <span className="font-semibold">{readiness.text}</span></p>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">النشاط الأخير</h3>
        {recentActivity.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">لا يوجد نشاط حديث بعد.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-800">{activity.message}</p>
                <p className="text-slate-600">{activity.detail}</p>
                <p className="mt-1 text-xs text-slate-500">{formatArabicDate(activity.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
