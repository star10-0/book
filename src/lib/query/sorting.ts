import type { Prisma } from "@prisma/client";

export function toSortOrder(value: unknown, fallback: Prisma.SortOrder = "desc"): Prisma.SortOrder {
  return value === "asc" || value === "desc" ? value : fallback;
}
