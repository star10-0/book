import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { PublicCurriculumLevelsList } from "@/components/curriculum/public-levels-list";
import { getPublicCurriculumLevels } from "@/lib/curriculum/public";

export const metadata: Metadata = {
  title: "المنهاج",
  description: "تصفّح مستويات المنهاج الدراسية واكتشف الكتب المخصصة لكل مستوى.",
};

export default async function CurriculumPage() {
  const levels = await getPublicCurriculumLevels();

  return (
    <div className="store-shell space-y-8 pb-10 pt-6 sm:space-y-10 sm:pt-8">
      <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-l from-indigo-50 via-white to-violet-50 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-wide text-indigo-700">المنهاج</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">استكشف المنهاج الدراسي</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">هذا القسم مخصص للكتب المرتبة حسب المستوى الدراسي، مع تجربة تصفّح واضحة ومنظمة للطلاب وأولياء الأمور.</p>
      </section>

      <PublicCurriculumLevelsList levels={levels} />
      <SiteFooter />
    </div>
  );
}
