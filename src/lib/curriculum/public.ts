import "server-only";

import { prisma } from "@/lib/prisma";

export async function getPublicCurriculumLevels() {
  return prisma.curriculumLevel.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      nameAr: true,
      description: true,
      sortOrder: true,
      _count: {
        select: {
          books: true,
        },
      },
    },
  });
}

export async function getPublicCurriculumLevelBySlug(slug: string) {
  return prisma.curriculumLevel.findFirst({
    where: {
      slug,
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      nameAr: true,
      description: true,
      books: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          sortOrder: true,
          book: {
            select: {
              id: true,
              slug: true,
              titleAr: true,
              metadata: true,
              coverImageUrl: true,
              author: {
                select: {
                  nameAr: true,
                },
              },
              category: {
                select: {
                  nameAr: true,
                },
              },
              offers: {
                where: {
                  isActive: true,
                },
                orderBy: {
                  priceCents: "asc",
                },
                select: {
                  id: true,
                  type: true,
                  priceCents: true,
                  currency: true,
                  rentalDays: true,
                },
              },
              reviews: {
                select: {
                  rating: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
