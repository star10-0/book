import type { BookStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CurriculumIntegrityBook = {
  id: string;
  titleAr: string;
  slug: string;
  status: BookStatus;
};

type CurriculumIntegrityLevel = {
  id: string;
  nameAr: string;
  slug: string;
  sortOrder: number;
  books: Array<{
    id: string;
    sortOrder: number;
    book: CurriculumIntegrityBook;
  }>;
};

export type CurriculumIntegritySnapshot = {
  totals: {
    levels: number;
    emptyLevels: number;
    unassignedBooks: number;
    duplicateLevelOrders: number;
    duplicateBookOrders: number;
  };
  emptyLevels: Array<{ id: string; nameAr: string; slug: string }>;
  unassignedBooks: CurriculumIntegrityBook[];
  duplicateLevelOrderGroups: Array<{ sortOrder: number; levels: Array<{ id: string; nameAr: string; slug: string }> }>;
  duplicateBookOrderGroups: Array<{ levelId: string; levelNameAr: string; sortOrder: number; count: number }>;
};

function mapDuplicates(values: number[]) {
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([sortOrder]) => sortOrder);
}

export function buildCurriculumIntegritySnapshot(input: { levels: CurriculumIntegrityLevel[]; books: CurriculumIntegrityBook[] }): CurriculumIntegritySnapshot {
  const levelsByBookId = new Set(input.levels.flatMap((level) => level.books.map((item) => item.book.id)));

  const emptyLevels = input.levels.filter((level) => level.books.length === 0).map((level) => ({ id: level.id, nameAr: level.nameAr, slug: level.slug }));

  const unassignedBooks = input.books.filter((book) => !levelsByBookId.has(book.id));

  const duplicateLevelOrders = mapDuplicates(input.levels.map((level) => level.sortOrder));

  const duplicateLevelOrderGroups = duplicateLevelOrders.map((sortOrder) => ({
    sortOrder,
    levels: input.levels.filter((level) => level.sortOrder === sortOrder).map((level) => ({ id: level.id, nameAr: level.nameAr, slug: level.slug })),
  }));

  const duplicateBookOrderGroups = input.levels.flatMap((level) => {
    const duplicateSortOrders = mapDuplicates(level.books.map((item) => item.sortOrder));
    return duplicateSortOrders.map((sortOrder) => ({
      levelId: level.id,
      levelNameAr: level.nameAr,
      sortOrder,
      count: level.books.filter((item) => item.sortOrder === sortOrder).length,
    }));
  });

  return {
    totals: {
      levels: input.levels.length,
      emptyLevels: emptyLevels.length,
      unassignedBooks: unassignedBooks.length,
      duplicateLevelOrders: duplicateLevelOrderGroups.length,
      duplicateBookOrders: duplicateBookOrderGroups.length,
    },
    emptyLevels,
    unassignedBooks,
    duplicateLevelOrderGroups,
    duplicateBookOrderGroups,
  };
}

export async function loadCurriculumIntegritySnapshot(): Promise<CurriculumIntegritySnapshot> {
  const [levels, books] = await Promise.all([
    prisma.curriculumLevel.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        nameAr: true,
        slug: true,
        sortOrder: true,
        books: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            sortOrder: true,
            book: {
              select: {
                id: true,
                titleAr: true,
                slug: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.book.findMany({
      where: { format: "DIGITAL" },
      orderBy: { titleAr: "asc" },
      select: {
        id: true,
        titleAr: true,
        slug: true,
        status: true,
      },
    }),
  ]);

  return buildCurriculumIntegritySnapshot({ levels, books });
}
