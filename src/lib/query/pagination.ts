import type { Prisma } from "@prisma/client";

import { PAGINATION } from "@/lib/constants/app";
import { clampNumber, toPositiveInt } from "@/lib/utils/common";

type PaginationInput = {
  page?: string | number;
  pageSize?: string | number;
};

export function getPagination(input: PaginationInput = {}) {
  const page = toPositiveInt(input.page, PAGINATION.defaultPage);
  const rawPageSize = toPositiveInt(input.pageSize, PAGINATION.defaultPageSize);
  const pageSize = clampNumber(rawPageSize, 1, PAGINATION.maxPageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  } satisfies Pick<Prisma.BookFindManyArgs, "skip" | "take"> & {
    page: number;
    pageSize: number;
  };
}

export function getTotalPages(totalItems: number, pageSize: number): number {
  if (totalItems <= 0) {
    return 0;
  }

  return Math.ceil(totalItems / pageSize);
}
