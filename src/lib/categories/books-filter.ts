import type { Prisma } from "@prisma/client";

export function buildBooksCategoryWhere(category: string): Prisma.BookWhereInput {
  if (category === "all") {
    return {};
  }

  if (category.startsWith("id:")) {
    const categoryId = category.slice(3).trim();
    if (!categoryId) {
      return {};
    }

    return {
      categoryId,
      category: {
        isActive: true,
      },
    };
  }

  // Legacy fallback for old slug-based links: constrain to root-level categories only
  // to keep deterministic behavior after introducing parent-scoped slugs.
  return {
    category: {
      slug: category,
      parentId: null,
      isActive: true,
    },
  };
}
