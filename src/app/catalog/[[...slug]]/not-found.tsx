import Link from "next/link";

export default function CatalogNotFound() {
  return (
    <div className="store-shell space-y-4 pb-10 pt-6 sm:pt-8">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <h1 className="text-lg font-extrabold">تعذر العثور على هذا المسار</h1>
        <p className="mt-2 text-sm">قد يكون التصنيف غير موجود، غير نشط، أو تم تغيير رابطه.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/catalog" className="store-btn-secondary h-9 px-4 text-xs">
            العودة إلى الدليل
          </Link>
          <Link href="/books" className="store-btn-secondary h-9 px-4 text-xs">
            تصفح جميع الكتب
          </Link>
        </div>
      </section>
    </div>
  );
}
