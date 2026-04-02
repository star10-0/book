import Link from "next/link";

type CurriculumLevelPreview = {
  id: string;
  slug: string;
  nameAr: string;
  description: string | null;
  _count: {
    books: number;
  };
};

export function PublicCurriculumLevelsList({ levels }: { levels: CurriculumLevelPreview[] }) {
  if (levels.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-10">
        <h2 className="text-xl font-bold text-slate-900">لا توجد مستويات منشورة حاليًا</h2>
        <p className="mt-2 text-sm text-slate-600">سيتم نشر مستويات المنهاج هنا عندما تصبح جاهزة.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-l from-white via-indigo-50/60 to-violet-50/70 p-5 sm:p-6">
        <h2 className="text-xl font-black text-slate-900 sm:text-2xl">المستويات الدراسية</h2>
        <p className="mt-1 text-sm text-slate-600">اختر المستوى المناسب لتصفّح الكتب المرتبطة به مباشرة.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {levels.map((level) => (
          <article key={level.id} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div>
              <p className="text-xs font-semibold text-indigo-700">قسم المنهاج</p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-900">{level.nameAr}</h3>
              {level.description ? <p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-600">{level.description}</p> : null}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{level._count.books} كتاب</span>
              <Link href={`/curriculum/${level.slug}`} className="store-btn-secondary h-9 px-4 text-xs">
                عرض الكتب
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
