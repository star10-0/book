export type CategoryBase = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string | null;
  description: string | null;
  kind: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  icon: string | null;
  coverImage: string | null;
  themeKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryTreeNode = CategoryBase & {
  children: CategoryTreeNode[];
  depth: number;
  childrenCount: number;
  booksCount: number;
  parentNameAr: string | null;
};

export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
