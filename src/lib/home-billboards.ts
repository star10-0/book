export type HomeBillboard = {
  id: string;
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  supportingPoints: string[];
};

export const HOME_BILLBOARD_FALLBACKS: HomeBillboard[] = [
  {
    id: "ramadan-digital-reads",
    badge: "عرض السوق",
    title: "مكتبة رقمية عربية بعروض شراء واستئجار يومية",
    description:
      "اكتشف كتبًا جديدة كل يوم مع تجربة شراء واضحة، وخيارات استئجار مرنة تناسب وقت قراءتك.",
    ctaLabel: "تصفح كل الكتب",
    ctaHref: "/books",
    supportingPoints: [
      "خصومات دورية على الإصدارات الجديدة",
      "تصنيفات متنوعة من الأدب إلى التطوير الذاتي",
      "دعم كامل للقراءة الرقمية من أي جهاز",
    ],
  },
  {
    id: "rentals-spotlight",
    badge: "تجربة سريعة",
    title: "ابدأ الآن من بوابة الاستئجار الرقمي",
    description:
      "استأجر الكتب لفترات مناسبة وابدأ القراءة فورًا دون انتظار، مع إمكانية الترقية للشراء لاحقًا.",
    ctaLabel: "عروض الاستئجار",
    ctaHref: "/books?offer=rent",
    supportingPoints: [
      "فترات استئجار مرنة",
      "تجربة اقتصادية قبل الشراء",
      "تنبيهات واضحة قبل انتهاء فترة الوصول",
    ],
  },
];
