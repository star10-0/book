import { prisma } from "@/lib/prisma";

const defaultDevelopmentCategories = [
  { slug: "riwayat", nameAr: "روايات" },
  { slug: "tarikh", nameAr: "تاريخ" },
  { slug: "atfal", nameAr: "أطفال" },
  { slug: "din", nameAr: "دين" },
  { slug: "taqnia", nameAr: "تقنية" },
  { slug: "tanmia-basharia", nameAr: "تنمية بشرية" },
] as const;

export async function ensureDevelopmentCategories() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const existingCount = await prisma.category.count();

  if (existingCount > 0) {
    return;
  }

  await prisma.category.createMany({
    data: defaultDevelopmentCategories.map((category) => ({
      slug: category.slug,
      nameAr: category.nameAr,
      nameEn: category.nameAr,
    })),
    skipDuplicates: true,
  });
}
