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
      <PublicCurriculumLevelsList levels={levels} />
      <SiteFooter />
    </div>
  );
}
