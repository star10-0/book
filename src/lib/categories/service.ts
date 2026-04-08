import "server-only";

import { isValidCatalogPathSlugs } from "@/lib/categories/path";
import { prisma } from "@/lib/prisma";
import { CATEGORY_SLUG_PATTERN, type CategoryBase, type CategoryTreeNode } from "@/lib/categories/types";

type CategoryWithCounts = CategoryBase & {
  _count?: {
    children?: number;
    books?: number;
  };
};

function sortCategories(a: Pick<CategoryBase, "sortOrder" | "nameAr">, b: Pick<CategoryBase, "sortOrder" | "nameAr">) {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.nameAr.localeCompare(b.nameAr, "ar");
}

function buildParentMap(items: CategoryWithCounts[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function buildCategoryTree(items: CategoryWithCounts[], parentId: string | null = null, depth = 0, parentMap = buildParentMap(items)): CategoryTreeNode[] {
  return items
    .filter((item) => item.parentId === parentId)
    .sort(sortCategories)
    .map((item) => {
      const children = buildCategoryTree(items, item.id, depth + 1, parentMap);
      return {
        ...item,
        depth,
        children,
        childrenCount: item._count?.children ?? children.length,
        booksCount: item._count?.books ?? 0,
        parentNameAr: item.parentId ? parentMap.get(item.parentId)?.nameAr ?? null : null,
      };
    });
}

export async function getAdminCategoryTree() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
    include: {
      _count: {
        select: {
          children: true,
          books: true,
        },
      },
    },
  });

  return buildCategoryTree(categories);
}

export async function getAdminCategoryFlatOptions() {
  const categories = await getAdminCategoryTree();

  const flattened: Array<{ id: string; nameAr: string; depth: number; isActive: boolean }> = [];

  const walk = (nodes: CategoryTreeNode[]) => {
    for (const node of nodes) {
      flattened.push({ id: node.id, nameAr: node.nameAr, depth: node.depth, isActive: node.isActive });
      walk(node.children);
    }
  };

  walk(categories);
  return flattened;
}

export async function getPublicRootCategories() {
  return prisma.category.findMany({
    where: {
      parentId: null,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
    select: {
      id: true,
      slug: true,
      nameAr: true,
      description: true,
      icon: true,
      coverImage: true,
      themeKey: true,
      _count: {
        select: {
          children: { where: { isActive: true } },
          books: {
            where: {
              status: "PUBLISHED",
              format: "DIGITAL",
            },
          },
        },
      },
    },
  });
}

export async function resolvePublicCategoryPath(slugs: string[]) {
  if (!isValidCatalogPathSlugs(slugs, CATEGORY_SLUG_PATTERN)) {
    return null;
  }

  const breadcrumb: Array<{ id: string; slug: string; nameAr: string }> = [];
  let currentParentId: string | null = null;
  let currentCategory: {
    id: string;
    slug: string;
    nameAr: string;
    description: string | null;
    parentId: string | null;
    isActive: boolean;
    icon: string | null;
    coverImage: string | null;
    themeKey: string | null;
  } | null = null;

  for (const slug of slugs) {
    const nextCategory: {
      id: string;
      slug: string;
      nameAr: string;
      description: string | null;
      parentId: string | null;
      isActive: boolean;
      icon: string | null;
      coverImage: string | null;
      themeKey: string | null;
    } | null = await prisma.category.findFirst({
      where: {
        slug,
        parentId: currentParentId,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        nameAr: true,
        description: true,
        parentId: true,
        isActive: true,
        icon: true,
        coverImage: true,
        themeKey: true,
      },
    });

    if (!nextCategory) {
      return null;
    }

    breadcrumb.push({ id: nextCategory.id, slug: nextCategory.slug, nameAr: nextCategory.nameAr });
    currentParentId = nextCategory.id;
    currentCategory = nextCategory;
  }

  if (!currentCategory) {
    return null;
  }

  const [children, books] = await Promise.all([
    prisma.category.findMany({
      where: {
        parentId: currentCategory.id,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
      select: {
        id: true,
        slug: true,
        nameAr: true,
        description: true,
        icon: true,
        coverImage: true,
        themeKey: true,
        _count: {
          select: {
            children: { where: { isActive: true } },
            books: {
              where: {
                status: "PUBLISHED",
                format: "DIGITAL",
              },
            },
          },
        },
      },
    }),
    prisma.book.findMany({
      where: {
        categoryId: currentCategory.id,
        status: "PUBLISHED",
        format: "DIGITAL",
        offers: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        author: { select: { nameAr: true } },
        category: { select: { nameAr: true } },
        offers: {
          where: { isActive: true },
          orderBy: { priceCents: "asc" },
          select: {
            id: true,
            type: true,
            priceCents: true,
            currency: true,
            rentalDays: true,
          },
        },
        reviews: { select: { rating: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  return {
    category: currentCategory,
    breadcrumb,
    children,
    books,
  };
}

export async function getPublicCategorySiblings(parentId: string | null, currentCategoryId: string) {
  if (parentId === null) {
    return [];
  }

  return prisma.category.findMany({
    where: {
      parentId,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
    select: {
      id: true,
      slug: true,
      nameAr: true,
      description: true,
      _count: {
        select: {
          children: { where: { isActive: true } },
          books: {
            where: {
              status: "PUBLISHED",
              format: "DIGITAL",
            },
          },
        },
      },
    },
  }).then((items) =>
    items.map((item) => ({
      ...item,
      isCurrent: item.id === currentCategoryId,
    })),
  );
}
