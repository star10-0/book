import { prisma } from "@/lib/prisma";

const defaultDevelopmentCategories = [
  {
    slug: "educational-curricula",
    nameAr: "المناهج التعليمية",
    kind: "section",
    children: [
      {
        slug: "syria-curriculum",
        nameAr: "سوريا",
        kind: "country",
        children: [
          { slug: "grade-7", nameAr: "الصف السابع", kind: "grade" },
          { slug: "grade-8", nameAr: "الصف الثامن", kind: "grade" },
        ],
      },
    ],
  },
  {
    slug: "universities",
    nameAr: "الجامعات",
    kind: "section",
    children: [
      {
        slug: "damascus-university",
        nameAr: "جامعة دمشق",
        kind: "university",
        children: [
          { slug: "faculty-of-science", nameAr: "كلية العلوم", kind: "college" },
          { slug: "faculty-of-law", nameAr: "كلية الحقوق", kind: "college" },
        ],
      },
    ],
  },
  { slug: "interactive-books", nameAr: "كتب تفاعلية", kind: "section" },
  { slug: "recorded-sessions", nameAr: "جلسات مسجلة", kind: "section" },
  { slug: "enrichment-activities", nameAr: "أنشطة إثرائية", kind: "section" },
] as const;

type SeedNode = (typeof defaultDevelopmentCategories)[number] & {
  children?: ReadonlyArray<SeedNode>;
};

async function upsertNode(node: SeedNode, parentId: string | null = null, sortOrder = 0) {
  const existing = await prisma.category.findFirst({
    where: { slug: node.slug, parentId },
    select: { id: true },
  });

  const category = existing
    ? await prisma.category.update({
        where: { id: existing.id },
        data: {
          nameAr: node.nameAr,
          nameEn: node.nameAr,
          kind: node.kind,
          sortOrder,
          isActive: true,
        },
      })
    : await prisma.category.create({
        data: {
          slug: node.slug,
          nameAr: node.nameAr,
          nameEn: node.nameAr,
          kind: node.kind,
          parentId,
          sortOrder,
          isActive: true,
        },
      });

  if (!node.children || node.children.length === 0) {
    return;
  }

  for (let index = 0; index < node.children.length; index += 1) {
    await upsertNode(node.children[index], category.id, index);
  }
}

export async function ensureDevelopmentCategories() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const existingCount = await prisma.category.count();

  if (existingCount > 0) {
    return;
  }

  for (let index = 0; index < defaultDevelopmentCategories.length; index += 1) {
    await upsertNode(defaultDevelopmentCategories[index] as SeedNode, null, index);
  }
}
